import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartOfAccount, JournalEntry, JournalLine } from './accounting.schema';
import { PostingService } from './posting.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

export type JournalListItem = {
  _id: string;
  journalNumber: string;
  date: string;
  description: string;
  sourceType: string;
  sourceId: string;
  posted: boolean;
  voided: boolean;
  reversalOf?: string;
  reversedBy?: string;
  createdAt: string;
  totalAmount: number;
  lineCount: number;
};

export type JournalDetail = JournalListItem & {
  lines: Array<{
    _id: string;
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
    businessLine?: string;
    counterparty?: string;
  }>;
};

export type ManualEntryInput = {
  date: string;                  // YYYY-MM-DD
  description: string;
  lines: Array<{
    accountCode: string;
    debit?: number;
    credit?: number;
    memo?: string;
  }>;
};

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
    @InjectModel(JournalLine.name) private lines: Model<JournalLine>,
    @InjectModel(ChartOfAccount.name) private accounts: Model<ChartOfAccount>,
    private readonly posting: PostingService,
  ) {}

  async list(
    rawContext: OrganizationContext,
    from?: Date,
    to?: Date,
    limit = 200,
  ): Promise<JournalListItem[]> {
    const context = requireOrganizationContext(rawContext);
    const filter: Record<string, unknown> = {
      organizationId: context.organizationId,
    };
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      filter.date = dateFilter;
    }

    const entries = await this.entries
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    if (entries.length === 0) return [];

    // Aggregate totals per entry
    const entryIds = entries.map(e => e._id);
    const sums = await this.lines.aggregate([
      { $match: { organizationId: context.organizationId, journalEntryId: { $in: entryIds } } },
      {
        $group: {
          _id: '$journalEntryId',
          totalDebit: { $sum: '$debit' },
          lineCount: { $sum: 1 },
        },
      },
    ]);
    const totalsById = new Map(sums.map((s: any) => [String(s._id), s]));

    return entries.map(e => {
      const totals = totalsById.get(String(e._id));
      return {
        _id: String(e._id),
        journalNumber: e.journalNumber,
        date: (e.date as Date).toISOString().slice(0, 10),
        description: e.description,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        posted: e.posted,
        voided: e.voided ?? false,
        reversalOf: e.reversalOf,
        reversedBy: e.reversedBy,
        createdAt: (e.createdAt as Date).toISOString(),
        totalAmount: totals?.totalDebit ?? 0,
        lineCount: totals?.lineCount ?? 0,
      };
    });
  }

  async detail(rawContext: OrganizationContext, id: string): Promise<JournalDetail> {
    const context = requireOrganizationContext(rawContext);
    const entry = await this.entries.findOne(
      organizationFilter(context, { _id: id }),
    ).lean();
    if (!entry) throw new NotFoundException('Journal entry not found');

    const lines = await this.lines.find(
      organizationFilter(context, { journalEntryId: entry._id }),
    ).lean();

    const accountIds = lines.map(l => l.accountId);
    const accounts = await this.accounts.find(
      organizationFilter(context, { _id: { $in: accountIds } }),
    ).lean();
    const accountMap = new Map(accounts.map(a => [String(a._id), a]));

    const totalAmount = lines.reduce((s, l) => s + l.debit, 0);

    return {
      _id: String(entry._id),
      journalNumber: entry.journalNumber,
      date: (entry.date as Date).toISOString().slice(0, 10),
      description: entry.description,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      posted: entry.posted,
      voided: entry.voided ?? false,
      reversalOf: entry.reversalOf,
      reversedBy: entry.reversedBy,
      createdAt: (entry.createdAt as Date).toISOString(),
      totalAmount,
      lineCount: lines.length,
      lines: lines.map(l => {
        const acct = accountMap.get(String(l.accountId));
        return {
          _id: String(l._id),
          accountId: String(l.accountId),
          accountCode: l.accountCode,
          accountName: acct?.name ?? '(unknown)',
          debit: l.debit,
          credit: l.credit,
          memo: l.memo,
          businessLine: l.businessLine,
          counterparty: l.counterparty,
        };
      }),
    };
  }

  async createManual(
    rawContext: OrganizationContext,
    input: ManualEntryInput,
    actor: string,
  ): Promise<JournalDetail> {
    const context = requireOrganizationContext(rawContext);

    if (!input.description || input.description.trim().length < 3) {
      throw new BadRequestException('Description must be at least 3 characters');
    }
    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException('At least two lines required (one debit, one credit)');
    }

    // Validate + normalise lines
    const normalised = input.lines.map((l, i) => {
      const debit = Number(l.debit ?? 0);
      const credit = Number(l.credit ?? 0);
      if (debit < 0 || credit < 0) throw new BadRequestException(`Line ${i + 1}: amounts must be non-negative`);
      if (debit > 0 && credit > 0) throw new BadRequestException(`Line ${i + 1}: cannot have both debit and credit`);
      if (debit === 0 && credit === 0) throw new BadRequestException(`Line ${i + 1}: zero-amount line not allowed`);
      if (!l.accountCode) throw new BadRequestException(`Line ${i + 1}: accountCode required`);
      return {
        accountCode: l.accountCode,
        debit,
        credit,
        memo: l.memo,
      };
    });

    const totalDebit = normalised.reduce((s, l) => s + l.debit, 0);
    const totalCredit = normalised.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new BadRequestException(
        `Entry does not balance: debits ${totalDebit} ≠ credits ${totalCredit}`,
      );
    }

    // Post via PostingService (sourceType: ManualJournal, sourceId: generated uuid)
    const sourceId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const entry = await this.posting.post(context, {
      date: new Date(input.date + 'T12:00:00.000Z'),
      description: input.description.trim(),
      sourceType: 'ManualJournal',
      sourceId,
      createdBy: actor,
      lines: normalised,
    });

    return this.detail(rawContext, String(entry._id));
  }

  async reverse(
    rawContext: OrganizationContext,
    id: string,
    reason: string,
    actor: string,
  ): Promise<JournalDetail> {
    const context = requireOrganizationContext(rawContext);
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('Reversal reason must be at least 10 characters');
    }

    const original = await this.entries.findOne(
      organizationFilter(context, { _id: id }),
    ).lean();
    if (!original) throw new NotFoundException('Journal entry not found');
    if (original.voided) throw new BadRequestException('Entry is already voided');
    if (original.reversedBy) {
      throw new BadRequestException(
        `Entry already reversed by ${original.reversedBy}`,
      );
    }
    if (!original.posted) throw new BadRequestException('Cannot reverse an unposted entry');

    const originalLines = await this.lines.find(
      organizationFilter(context, { journalEntryId: original._id }),
    ).lean();
    if (originalLines.length === 0) throw new BadRequestException('Original entry has no lines');

    // Build reversal lines: swap debit ↔ credit
    const reversalLines = originalLines.map(l => ({
      accountCode: l.accountCode,
      debit: l.credit,
      credit: l.debit,
      memo: `Reversal: ${l.memo ?? original.description}`,
      businessLine: l.businessLine,
      counterparty: l.counterparty,
    }));

    const sourceId = `${original._id}:reversal:${Date.now()}`;

    const reversalEntry = await this.posting.post(context, {
      date: new Date(),
      description: `Reversal of ${original.journalNumber} — ${reason.trim()}`,
      sourceType: 'ManualJournal',
      sourceId,
      createdBy: actor,
      lines: reversalLines,
    });

    // Link both directions
    await this.entries.updateOne(
      { _id: original._id },
      { $set: { reversedBy: reversalEntry.journalNumber } },
    );
    await this.entries.updateOne(
      { _id: reversalEntry._id },
      { $set: { reversalOf: original.journalNumber } },
    );

    return this.detail(rawContext, String(reversalEntry._id));
  }
}