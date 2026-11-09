import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinanceTransaction } from './finance.schema';
import { CreateFinanceDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(FinanceTransaction.name) private model: Model<FinanceTransaction>,
    private readonly audit: AuditService,
  ) {}

  findAll(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.model.find(organizationFilter(context)).sort({ date: -1 }).limit(500).lean();
  }

  async create(dto: CreateFinanceDto, rawContext: OrganizationContext, actorEmail: string) {
    const context = requireOrganizationContext(rawContext);
    const payload = organizationDocument(context, dto as unknown as Record<string, unknown>);
    let created: any;
    try {
      created = await this.model.create(payload);
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new BadRequestException(`Transaction "${dto.transactionId}" already exists in this organization`);
      }
      throw e;
    }
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

    const after = await this.model.findOneAndUpdate(
      organizationFilter(context, { _id: id }),
      safeUpdate,
      { new: true, runValidators: true },
    ).lean();
    if (!after) throw new NotFoundException('Transaction not found');

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