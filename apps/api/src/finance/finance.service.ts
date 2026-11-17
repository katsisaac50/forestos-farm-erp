import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinanceTransaction } from './finance.schema';
import { CreateFinanceDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';
import { FinanceGlAdapter } from '../accounting/finance-gl-adapter.service';

/** Fields that, once a JournalEntry exists for the transaction, cannot be changed. */
const GL_LOCKED_FIELDS = [
  'amountUgx',
  'category',
  'direction',
  'businessLine',
  'paymentMethod',
  'date',
] as const;

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectModel(FinanceTransaction.name) private model: Model<FinanceTransaction>,
    private readonly audit: AuditService,
    private readonly gl: FinanceGlAdapter,
  ) {}

  findAll(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.model.find(organizationFilter(context)).sort({ date: -1 }).limit(500).lean();
  }

  async create(dto: CreateFinanceDto, rawContext: OrganizationContext, actorEmail: string) {
    const context = requireOrganizationContext(rawContext);
    const payload = organizationDocument(context, dto as unknown as Record<string, unknown>);
    let created: any;

    // Step 1: create the Finance doc — duplicates throw here
    try {
      created = await this.model.create(payload);
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException(
          `Transaction "${dto.transactionId}" already exists in this organization`,
        );
      }
      throw e;
    }

    // Step 2: post to GL — only reached if create succeeded, so `created` exists
    try {
      await this.gl.postTransaction(context, created.toObject());
    } catch (e: any) {
      // Period locked → reject the whole thing. This is a business rule, not a glitch.
      if (e?.status === 400 && /locked period/i.test(e.message)) {
        await this.model.deleteOne({ _id: created._id });
        throw e;
      }

      // Any other GL error → log and proceed. The backfill script will sweep it up.
      // Do NOT reject the Finance doc — it's already valid and users expect it saved.
      this.logger.error(
        `GL post failed for ${created.transactionId} (${created._id}): ${e.message}`,
        e.stack,
      );
    }

    // Step 3: audit
    await this.audit.record(
      actorEmail,
      'FINANCE_TRANSACTION_CREATED',
      'FinanceTransaction',
      String(created._id),
      `Created finance transaction ${created.transactionId}`,
      { after: this.auditSnapshot(created.toObject()) },
    );

    return created;
  }

  async update(id: string, dto: Partial<CreateFinanceDto>, rawContext: OrganizationContext, actorEmail: string) {
    const context = requireOrganizationContext(rawContext);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid transaction id');

    const before = await this.model.findOne(organizationFilter(context, { _id: id })).lean();
    if (!before) throw new NotFoundException('Transaction not found');

    // A transaction's human-readable identifier is immutable after creation.
    const safeUpdate: Record<string, unknown> = { ...dto };
    delete safeUpdate.transactionId;
    delete (safeUpdate as any).organizationId;
    delete (safeUpdate as any).createdBy;

    // GL lock: once a JournalEntry exists for this transaction, GL-affecting
    // fields cannot be edited. Reverse-and-repost instead.
    const glLockedAttempted = Object.keys(safeUpdate).filter(k =>
      (GL_LOCKED_FIELDS as readonly string[]).includes(k),
    );
    if (glLockedAttempted.length > 0) {
      const posted = await this.gl.hasPostedEntry(context, String(before._id));
      if (posted) {
        throw new BadRequestException(
          `Cannot edit ${glLockedAttempted.join(', ')} on a posted transaction. ` +
            `Void and recreate, or post a reversing entry. ` +
            `Only 'reconciled', 'notes', 'counterparty', 'receiptReference' may be edited after posting.`,
        );
      }
    }

    const after = await this.model.findOneAndUpdate(
      organizationFilter(context, { _id: id }),
      safeUpdate,
      { new: true, runValidators: true },
    ).lean();
    if (!after) throw new NotFoundException('Transaction not found');

    // If GL-relevant fields changed AND no journal existed (edge case: GL post failed earlier),
    // try to post now that the data is corrected.
    if (glLockedAttempted.length > 0) {
      try {
        await this.gl.postTransaction(context, after);
      } catch (e: any) {
        this.logger.error(
          `Late GL post failed for ${after.transactionId} (${after._id}): ${e.message}`,
          e.stack,
        );
      }
    }

    await this.audit.record(
      actorEmail,
      'FINANCE_TRANSACTION_UPDATED',
      'FinanceTransaction',
      String(after._id),
      `Updated finance transaction ${after.transactionId}`,
      {
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(after),
        requestedFields: Object.keys(safeUpdate),
        glLockedBlocked: glLockedAttempted,
      },
    );
    return after;
  }

  private auditSnapshot(value: any) {
    return {
      transactionId: value.transactionId,
      date: value.date,
      direction: value.direction,
      businessLine: value.businessLine,
      category: value.category,
      description: value.description,
      amountUgx: value.amountUgx,
      paymentMethod: value.paymentMethod,
      counterparty: value.counterparty,
      receiptReference: value.receiptReference,
      reconciled: value.reconciled,
      notes: value.notes,
    };
  }
}