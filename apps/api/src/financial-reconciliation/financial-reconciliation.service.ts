import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialReconciliation } from './financial-reconciliation.schema';
import { CreateReconciliationDto } from './dto';
import { FinanceTransaction } from '../finance/finance.schema';

@Injectable()
export class FinancialReconciliationService {
  constructor(
    @InjectModel(FinancialReconciliation.name) private reconciliations: Model<FinancialReconciliation>,
    @InjectModel(FinanceTransaction.name) private transactions: Model<FinanceTransaction>,
  ) {}

  list(month?: string) {
    if (month && !/^\\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
    return this.reconciliations.find(month ? { month } : {}).sort({ month: -1, accountName: 1 }).limit(300).lean();
  }

  async create(dto: CreateReconciliationDto, actor: string) {
    const [year, monthNumber] = dto.month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));
    const rows = await this.transactions.find({ date: { $gte: start, $lt: end } }).lean();
    const ledgerIncomeUgx = rows.filter((r: any) => r.direction === 'Income').reduce((s: number, r: any) => s + (Number(r.amountUgx) || 0), 0);
    const ledgerExpenseUgx = rows.filter((r: any) => r.direction === 'Expense').reduce((s: number, r: any) => s + (Number(r.amountUgx) || 0), 0);
    const expectedClosingBalanceUgx = dto.openingBalanceUgx + dto.statementIncomeUgx - dto.statementExpenseUgx;
    const closingDifferenceUgx = dto.statementClosingBalanceUgx - expectedClosingBalanceUgx;
    const difference = Math.abs(closingDifferenceUgx) > 1;
    return this.reconciliations.create({
      ...dto,
      ledgerIncomeUgx,
      ledgerExpenseUgx,
      expectedClosingBalanceUgx,
      closingDifferenceUgx,
      status: difference ? 'Difference found' : 'Matched',
      preparedBy: actor,
      reviewed: false,
    });
  }

  async review(id: string, actor: string, notes?: string) {
    const record = await this.reconciliations.findById(id);
    if (!record) throw new NotFoundException('Reconciliation record not found');
    record.reviewed = true;
    record.reviewedBy = actor;
    record.reviewedAt = new Date();
    if (notes?.trim()) record.notes = [record.notes, `Review: ${notes.trim()}`].filter(Boolean).join(' | ');
    if (record.status === 'Difference found') record.status = 'Needs review';
    await record.save();
    return record.toObject();
  }
}
