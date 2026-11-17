import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartOfAccount, JournalEntry } from './accounting.schema';
import { PostingService } from './posting.service';
import { DEFAULT_CHART } from './default-chart';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';
import { FinanceTransaction } from '../finance/finance.schema';
import {
  cashAccountFor,
  expenseAccountFor,
  incomeAccountFor,
} from './category-map';

@Injectable()
export class FinanceGlAdapter {
  private readonly logger = new Logger(FinanceGlAdapter.name);

  constructor(
    private readonly posting: PostingService,
    @InjectModel(ChartOfAccount.name) private accounts: Model<ChartOfAccount>,
    @InjectModel(JournalEntry.name) private journalEntries: Model<JournalEntry>,
  ) {}

  /** Post a finance transaction to the GL. Safe to call multiple times — idempotent. */
  async postTransaction(
    context: OrganizationContext,
    txn: FinanceTransaction & { _id?: any },
  ): Promise<void> {
    const ctx = requireOrganizationContext(context);
    await this.ensureChart(ctx);

    // Transfers move money between user-recognised buckets without changing total cash.
    // Your current schema has no "destination account" field, so we skip GL posting.
    if (txn.direction === 'Transfer') {
      this.logger.log(`Skipping GL posting for Transfer ${txn.transactionId}`);
      return;
    }

    const cashAccount = cashAccountFor(txn.paymentMethod);
    const date = new Date(txn.date);

    let lines;
    if (txn.direction === 'Expense') {
      const expenseAccount = expenseAccountFor(txn.category);
      lines = [
        {
          accountCode: expenseAccount,
          debit: txn.amountUgx,
          memo: txn.description,
          businessLine: txn.businessLine,
          counterparty: txn.counterparty,
        },
        {
          accountCode: cashAccount,
          credit: txn.amountUgx,
          memo: txn.description,
          businessLine: txn.businessLine,
        },
      ];
    } else {
      const incomeAccount = incomeAccountFor(txn.category);
      lines = [
        {
          accountCode: cashAccount,
          debit: txn.amountUgx,
          memo: txn.description,
          businessLine: txn.businessLine,
        },
        {
          accountCode: incomeAccount,
          credit: txn.amountUgx,
          memo: txn.description,
          businessLine: txn.businessLine,
          counterparty: txn.counterparty,
        },
      ];
    }

    await this.posting.post(ctx, {
      date,
      description: txn.description || txn.category,
      sourceType: 'FinanceTransaction',
      sourceId: String(txn._id),
      createdBy: txn.createdBy,
      lines,
    });
  }

  /** Check whether a JournalEntry already exists for a given source record. */
  async hasPostedEntry(context: OrganizationContext, sourceId: string): Promise<boolean> {
    const ctx = requireOrganizationContext(context);
    const count = await this.journalEntries.countDocuments(
      organizationFilter(ctx, {
        sourceType: 'FinanceTransaction',
        sourceId,
      }),
    );
    return count > 0;
  }

  /** Lazily seed the default chart of accounts for an organization. Idempotent. */
  private async ensureChart(context: OrganizationContext): Promise<void> {
    const ctx = requireOrganizationContext(context);
    const count = await this.accounts.countDocuments({ organizationId: ctx.organizationId });
    if (count > 0) return;
    await this.accounts.insertMany(
      DEFAULT_CHART.map(a =>
        organizationDocument(ctx, { ...a, active: true, isSystem: true }),
      ),
    );
    this.logger.log(`Seeded ${DEFAULT_CHART.length} accounts for org ${ctx.organizationId}`);
  }
}