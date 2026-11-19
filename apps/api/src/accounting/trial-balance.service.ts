import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartOfAccount, JournalEntry, JournalLine } from './accounting.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

export type TrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalSide: 'debit' | 'credit';
  debit: number;
  credit: number;
  net: number;            // signed: debit − credit
  netForDisplay: number;  // positive on the account's normal side
};

export type TrialBalanceReport = {
  organizationId: string;
  from: string | null;
  to: string | null;
  generatedAt: string;
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
    difference: number;
  };
  balanced: boolean;
};

@Injectable()
export class TrialBalanceService {
  constructor(
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
    @InjectModel(JournalLine.name) private lines: Model<JournalLine>,
    @InjectModel(ChartOfAccount.name) private accounts: Model<ChartOfAccount>,
  ) {}

  async generate(
    rawContext: OrganizationContext,
    from?: Date,
    to?: Date,
  ): Promise<TrialBalanceReport> {
    const context = requireOrganizationContext(rawContext);

    // Find all posted journal entries in the date range
    const entryFilter: Record<string, unknown> = {
      organizationId: context.organizationId,
      posted: true,
      voided: false,
    };
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = from;
      if (to) dateFilter.$lte = to;
      entryFilter.date = dateFilter;
    }
    const entryIds = (await this.entries.find(entryFilter).distinct('_id')) as any[];

    // Aggregate lines by account
    const agg = await this.lines.aggregate([
      { $match: { organizationId: context.organizationId, journalEntryId: { $in: entryIds } } },
      {
        $group: {
          _id: '$accountId',
          accountCode: { $first: '$accountCode' },
          debit: { $sum: '$debit' },
          credit: { $sum: '$credit' },
        },
      },
    ]);

    // Fetch account metadata
    const accounts = await this.accounts
      .find(organizationFilter(context))
      .lean();
    const byId = new Map(accounts.map(a => [String(a._id), a]));

    // Build rows for every account that has activity; skip zero-activity accounts
    const rows: TrialBalanceRow[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const a of agg) {
      const meta = byId.get(String(a._id));
      if (!meta) continue;
      const net = a.debit - a.credit;
      const netForDisplay = meta.normalSide === 'debit' ? net : -net;
      rows.push({
        accountId: String(a._id),
        accountCode: meta.code,
        accountName: meta.name,
        accountType: meta.type,
        normalSide: meta.normalSide as 'debit' | 'credit',
        debit: a.debit,
        credit: a.credit,
        net,
        netForDisplay,
      });
      totalDebit += a.debit;
      totalCredit += a.credit;
    }

    // Sort by account code (which groups assets, liabilities, revenue, expenses in order)
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const difference = Math.round((totalDebit - totalCredit) * 100) / 100;

    return {
      organizationId: context.organizationId,
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
      generatedAt: new Date().toISOString(),
      rows,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        difference,
      },
      balanced: Math.abs(difference) < 0.005,
    };
  }
}