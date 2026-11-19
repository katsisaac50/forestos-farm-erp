import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartOfAccount, JournalEntry, JournalLine } from './accounting.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

export type ReportLine = {
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
};

export type ProfitAndLoss = {
  organizationId: string;
  from: string;
  to: string;
  generatedAt: string;
  revenue: ReportLine[];
  revenueTotal: number;
  cogs: ReportLine[];
  cogsTotal: number;
  grossProfit: number;
  expenses: ReportLine[];
  expensesTotal: number;
  netIncome: number;
};

export type BalanceSheet = {
  organizationId: string;
  asOf: string;
  generatedAt: string;
  assets: ReportLine[];
  assetsTotal: number;
  liabilities: ReportLine[];
  liabilitiesTotal: number;
  equity: ReportLine[];
  equityTotal: number;
  retainedEarnings: number;
  balanced: boolean;
  difference: number;
};

export type CashFlow = {
  organizationId: string;
  from: string;
  to: string;
  generatedAt: string;
  openingCash: number;
  closingCash: number;
  netChange: number;
  inflows: Array<{ date: string; description: string; amount: number; journalNumber: string }>;
  outflows: Array<{ date: string; description: string; amount: number; journalNumber: string }>;
};

@Injectable()
export class FinancialReportsService {
  constructor(
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
    @InjectModel(JournalLine.name) private lines: Model<JournalLine>,
    @InjectModel(ChartOfAccount.name) private accounts: Model<ChartOfAccount>,
  ) {}

  /** Sum debits/credits per account for posted entries in a date range. */
  private async aggregate(
    context: OrganizationContext,
    dateFilter: { $gte?: Date; $lte?: Date },
    accountTypes?: string[],
  ): Promise<Map<string, { debit: number; credit: number }>> {
    const entryFilter: Record<string, unknown> = {
      organizationId: context.organizationId,
      posted: true,
      voided: false,
    };
    if (dateFilter.$gte || dateFilter.$lte) {
      entryFilter.date = dateFilter;
    }
    const entryIds = (await this.entries.find(entryFilter).distinct('_id')) as any[];

    const match: Record<string, unknown> = {
      organizationId: context.organizationId,
      journalEntryId: { $in: entryIds },
    };

    const agg = await this.lines.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$accountCode',
          debit: { $sum: '$debit' },
          credit: { $sum: '$credit' },
        },
      },
    ]);

    const result = new Map<string, { debit: number; credit: number }>();
    for (const a of agg) {
      result.set(a._id, { debit: a.debit, credit: a.credit });
    }

    // If filtering by account types, only keep those codes
    if (accountTypes && accountTypes.length) {
      const validAccounts = await this.accounts
        .find(organizationFilter(context, { type: { $in: accountTypes } }))
        .lean();
      const validCodes = new Set(validAccounts.map(a => a.code));
      for (const code of Array.from(result.keys())) {
        if (!validCodes.has(code)) result.delete(code);
      }
    }

    return result;
  }

  /** Resolve account metadata for a set of codes. */
  private async accountMeta(context: OrganizationContext, codes: string[]) {
    const accounts = await this.accounts
      .find(organizationFilter(context, { code: { $in: codes } }))
      .lean();
    return new Map(accounts.map(a => [a.code, a]));
  }

  async profitAndLoss(
    rawContext: OrganizationContext,
    from: Date,
    to: Date,
  ): Promise<ProfitAndLoss> {
    const context = requireOrganizationContext(rawContext);
    const agg = await this.aggregate(context, { $gte: from, $lte: to });
    const codes = Array.from(agg.keys());
    const meta = await this.accountMeta(context, codes);

    const revenue: ReportLine[] = [];
    const cogs: ReportLine[] = [];
    const expenses: ReportLine[] = [];

    for (const [code, { debit, credit }] of agg) {
      const m = meta.get(code);
      if (!m) continue;
      // Revenue: normal credit, amount = credit − debit
      if (m.type === 'revenue') {
        const amount = credit - debit;
        if (amount !== 0) {
          revenue.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
        }
      }
      // COGS: normal debit, amount = debit − credit
      else if (m.type === 'cogs') {
        const amount = debit - credit;
        if (amount !== 0) {
          cogs.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
        }
      }
      // Expense: normal debit
      else if (m.type === 'expense') {
        const amount = debit - credit;
        if (amount !== 0) {
          expenses.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
        }
      }
    }

    revenue.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    cogs.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    expenses.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const revenueTotal = revenue.reduce((s, r) => s + r.amount, 0);
    const cogsTotal = cogs.reduce((s, r) => s + r.amount, 0);
    const expensesTotal = expenses.reduce((s, r) => s + r.amount, 0);
    const grossProfit = revenueTotal - cogsTotal;
    const netIncome = grossProfit - expensesTotal;

    return {
      organizationId: context.organizationId,
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      revenue,
      revenueTotal,
      cogs,
      cogsTotal,
      grossProfit,
      expenses,
      expensesTotal,
      netIncome,
    };
  }

  async balanceSheet(
    rawContext: OrganizationContext,
    asOf: Date,
  ): Promise<BalanceSheet> {
    const context = requireOrganizationContext(rawContext);

    // Cumulative up to asOf
    const agg = await this.aggregate(context, { $lte: asOf });
    const codes = Array.from(agg.keys());
    const meta = await this.accountMeta(context, codes);

    const assets: ReportLine[] = [];
    const liabilities: ReportLine[] = [];
    const equity: ReportLine[] = [];

    let revenueTotal = 0;
    let cogsTotal = 0;
    let expensesTotal = 0;

    for (const [code, { debit, credit }] of agg) {
      const m = meta.get(code);
      if (!m) continue;

      if (m.type === 'asset') {
        const amount = debit - credit;
        if (amount !== 0) assets.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
      } else if (m.type === 'liability') {
        const amount = credit - debit;
        if (amount !== 0) liabilities.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
      } else if (m.type === 'equity') {
        const amount = credit - debit;
        if (amount !== 0) equity.push({ accountCode: code, accountName: m.name, accountType: m.type, amount });
      } else if (m.type === 'revenue') {
        revenueTotal += credit - debit;
      } else if (m.type === 'cogs') {
        cogsTotal += debit - credit;
      } else if (m.type === 'expense') {
        expensesTotal += debit - credit;
      }
    }

    assets.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    liabilities.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    equity.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const retainedEarnings = revenueTotal - cogsTotal - expensesTotal;

    const assetsTotal = assets.reduce((s, r) => s + r.amount, 0);
    const liabilitiesTotal = liabilities.reduce((s, r) => s + r.amount, 0);
    const equityTotal = equity.reduce((s, r) => s + r.amount, 0) + retainedEarnings;

    const difference = Math.round((assetsTotal - (liabilitiesTotal + equityTotal)) * 100) / 100;

    return {
      organizationId: context.organizationId,
      asOf: asOf.toISOString(),
      generatedAt: new Date().toISOString(),
      assets,
      assetsTotal,
      liabilities,
      liabilitiesTotal,
      equity,
      equityTotal,
      retainedEarnings,
      balanced: Math.abs(difference) < 0.005,
      difference,
    };
  }

  async cashFlow(
    rawContext: OrganizationContext,
    from: Date,
    to: Date,
  ): Promise<CashFlow> {
    const context = requireOrganizationContext(rawContext);

    // Cash accounts are all asset accounts whose code starts with 10 (1000-1099)
    const cashAccounts = await this.accounts
      .find(organizationFilter(context, {
        type: 'asset',
        code: { $regex: /^10/ },
      }))
      .lean();
    const cashCodes = cashAccounts.map(a => a.code);

    // Opening = cumulative up to (from - 1ms)
    const openingDate = new Date(from.getTime() - 1);
    const openingAgg = await this.aggregate(context, { $lte: openingDate });
    let openingCash = 0;
    for (const code of cashCodes) {
      const v = openingAgg.get(code);
      if (v) openingCash += v.debit - v.credit;
    }

    // Movement in the period
    const periodAgg = await this.aggregate(context, { $gte: from, $lte: to });
    let closingCash = openingCash;
    for (const code of cashCodes) {
      const v = periodAgg.get(code);
      if (v) closingCash += v.debit - v.credit;
    }

    // Detail: journals that touched a cash account in the period
    const entriesInPeriod = await this.entries
      .find(organizationFilter(context, {
        posted: true,
        voided: false,
        date: { $gte: from, $lte: to },
      }))
      .lean();

    const entryIds = entriesInPeriod.map(e => e._id);
    const cashLines = await this.lines.find(
      organizationFilter(context, {
        journalEntryId: { $in: entryIds },
        accountCode: { $in: cashCodes },
      }),
    ).lean();

    const entryById = new Map(entriesInPeriod.map(e => [String(e._id), e]));
    const inflows: CashFlow['inflows'] = [];
    const outflows: CashFlow['outflows'] = [];

    for (const line of cashLines) {
      const entry = entryById.get(String(line.journalEntryId));
      if (!entry) continue;
      const net = line.debit - line.credit;
      if (net === 0) continue;
      const item = {
        date: (entry.date as Date).toISOString().slice(0, 10),
        description: entry.description,
        amount: Math.abs(net),
        journalNumber: entry.journalNumber,
      };
      if (net > 0) inflows.push(item);
      else outflows.push(item);
    }
    inflows.sort((a, b) => a.date.localeCompare(b.date));
    outflows.sort((a, b) => a.date.localeCompare(b.date));

    return {
      organizationId: context.organizationId,
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      openingCash,
      closingCash,
      netChange: closingCash - openingCash,
      inflows,
      outflows,
    };
  }
}