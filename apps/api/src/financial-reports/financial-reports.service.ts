import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinanceTransaction } from '../finance/finance.schema';

@Injectable()
export class FinancialReportsService {
  constructor(@InjectModel(FinanceTransaction.name) private readonly model: Model<FinanceTransaction>) {}

  async monthly(month?: string) {
    const selectedMonth = month || new Date().toISOString().slice(0, 7);
    if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      throw new BadRequestException('month must use YYYY-MM format');
    }
    const [year, monthNumber] = selectedMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    const records = await this.model.find({ date: { $gte: start, $lt: end } })
      .sort({ date: 1, transactionId: 1 })
      .limit(2000)
      .lean();

    const totals = {
      incomeUgx: 0,
      expenseUgx: 0,
      transferUgx: 0,
      netMovementUgx: 0,
      recordCount: records.length,
      incomeCount: 0,
      expenseCount: 0,
      transferCount: 0,
      unreconciledCount: 0,
    };
    const byCategory: Record<string, { direction: string; category: string; amountUgx: number; count: number }> = {};

    for (const row of records) {
      const amount = Number(row.amountUgx) || 0;
      if (row.direction === 'Income') {
        totals.incomeUgx += amount;
        totals.incomeCount += 1;
      } else if (row.direction === 'Expense') {
        totals.expenseUgx += amount;
        totals.expenseCount += 1;
      } else {
        totals.transferUgx += amount;
        totals.transferCount += 1;
      }
      if (!row.reconciled) totals.unreconciledCount += 1;
      const key = `${row.direction}::${row.category || 'Uncategorised'}`;
      if (!byCategory[key]) byCategory[key] = {
        direction: row.direction,
        category: row.category || 'Uncategorised',
        amountUgx: 0,
        count: 0,
      };
      byCategory[key].amountUgx += amount;
      byCategory[key].count += 1;
    }

    totals.netMovementUgx = totals.incomeUgx - totals.expenseUgx;
    return {
      month: selectedMonth,
      currency: 'UGX',
      source: 'FinanceTransaction ledger',
      generatedAt: new Date().toISOString(),
      capped: records.length === 2000,
      totals,
      byCategory: Object.values(byCategory).sort((a, b) => b.amountUgx - a.amountUgx),
      records: records.map((r: any) => ({
        id: String(r._id),
        transactionId: r.transactionId,
        date: r.date,
        direction: r.direction,
        businessLine: r.businessLine,
        category: r.category,
        description: r.description,
        amountUgx: r.amountUgx,
        paymentMethod: r.paymentMethod,
        reconciled: Boolean(r.reconciled),
        receiptReference: r.receiptReference || '',
        counterparty: r.counterparty || '',
      })),
      notes: [
        'This report reads existing finance ledger records; it does not create or duplicate transactions.',
        'Net movement is income minus expenses. Transfers are shown separately and excluded from net movement.',
        'Only the first 2,000 matching records are returned. If capped is true, narrow the reporting period or extend pagination before relying on totals.',
        'This report is a management summary, not an audited statement or bank reconciliation.',
      ],
    };
  }
}
