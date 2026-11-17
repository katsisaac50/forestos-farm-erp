import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AccountingPeriod,
  ChartOfAccount,
  JournalEntry,
  JournalLine,
} from './accounting.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

export type JournalLineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
  memo?: string;
  businessLine?: string;
  counterparty?: string;
};

export type PostEntryInput = {
  date: Date;
  description: string;
  sourceType: string;
  sourceId: string;
  createdBy: string;
  lines: JournalLineInput[];
};

@Injectable()
export class PostingService {
  constructor(
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
    @InjectModel(JournalLine.name) private lines: Model<JournalLine>,
    @InjectModel(ChartOfAccount.name) private accounts: Model<ChartOfAccount>,
    @InjectModel(AccountingPeriod.name) private periods: Model<AccountingPeriod>,
  ) {}

  async post(rawContext: OrganizationContext, input: PostEntryInput): Promise<JournalEntry> {
    const context = requireOrganizationContext(rawContext);

    // 1. Validate: debits === credits, at least 2 lines, all amounts >= 0
    const totals = input.lines.reduce(
      (t, l) => ({
        debit: t.debit + (l.debit ?? 0),
        credit: t.credit + (l.credit ?? 0),
      }),
      { debit: 0, credit: 0 },
    );
    if (input.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }
    if (Math.abs(totals.debit - totals.credit) > 0.005) {
      throw new BadRequestException(
        `Journal entry does not balance: debits ${totals.debit} ≠ credits ${totals.credit}`,
      );
    }
    for (const l of input.lines) {
      if ((l.debit ?? 0) < 0 || (l.credit ?? 0) < 0) {
        throw new BadRequestException('Debit and credit amounts must be non-negative');
      }
      if ((l.debit ?? 0) > 0 && (l.credit ?? 0) > 0) {
        throw new BadRequestException('A line must have either debit or credit, not both');
      }
    }

    // 2. Check period lock
    const period = await this.periods.findOne(
      organizationFilter(context, {
        periodStart: { $lte: input.date },
        periodEnd: { $gte: input.date },
      }),
    ).lean();
    if (period?.locked) {
      throw new BadRequestException(
        `Cannot post to locked period ${period.periodStart.toISOString().slice(0, 10)} – ${period.periodEnd.toISOString().slice(0, 10)}. Reopen the period to post this transaction.`,
      );
    }

    // 3. Resolve account codes → account IDs (validates they exist)
    const accountCodes = Array.from(new Set(input.lines.map(l => l.accountCode)));
    const accounts = await this.accounts.find(
      organizationFilter(context, { code: { $in: accountCodes } }),
    ).lean();
    const accountByCode = new Map(accounts.map(a => [a.code, a]));
    const missing = accountCodes.filter(c => !accountByCode.has(c));
    if (missing.length) {
      throw new BadRequestException(
        `Unknown account codes: ${missing.join(', ')}. Create them in the chart of accounts first.`,
      );
    }

    // 4. Generate journal number (per org per year)
    const year = input.date.getUTCFullYear();
    const count = await this.entries.countDocuments(
      organizationFilter(context, {
        date: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) },
      }),
    );
    const journalNumber = `JE-${year}-${String(count + 1).padStart(5, '0')}`;

    // 5. Insert entry (unique index catches duplicates)
    let entry: any;
    try {
      entry = await this.entries.create(
        organizationDocument(context, {
          journalNumber,
          date: input.date,
          description: input.description,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          createdBy: input.createdBy,
          posted: true,
          postedAt: new Date(),
          postedBy: input.createdBy,
        }),
      );
    } catch (e: any) {
      if (e?.code === 11000) {
        // Already posted for this source — return existing
        const existing = await this.entries.findOne(
          organizationFilter(context, {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
          }),
        );
        if (existing) return existing.toObject();
        throw new BadRequestException('Duplicate journal entry');
      }
      throw e;
    }

    // 6. Insert lines
    await this.lines.insertMany(
      input.lines.map(l => ({
        organizationId: context.organizationId,
        journalEntryId: entry._id,
        accountId: accountByCode.get(l.accountCode)!._id,
        accountCode: l.accountCode,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
        memo: l.memo,
        businessLine: l.businessLine,
        counterparty: l.counterparty,
      })),
    );

    return entry.toObject();
  }

  /** Get or create the period row for a given date. Used during backfill. */
  async ensurePeriod(context: OrganizationContext, date: Date) {
    const ctx = requireOrganizationContext(context);
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const existing = await this.periods.findOne(
      organizationFilter(ctx, { periodStart: start, periodEnd: end }),
    );
    if (existing) return existing.toObject();
    const created = await this.periods.create(
      organizationDocument(ctx, { periodStart: start, periodEnd: end, status: 'open', locked: false }),
    );
    return created.toObject();
  }
}