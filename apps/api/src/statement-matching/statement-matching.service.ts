import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { StatementImport, StatementRow } from './statement-matching.schema';
import { ImportStatementDto } from './dto';
import { FinanceTransaction } from '../finance/finance.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StatementMatchingService {
  constructor(
    @InjectModel(StatementImport.name) private imports: Model<StatementImport>,
    @InjectModel(StatementRow.name) private rows: Model<StatementRow>,
    @InjectModel(FinanceTransaction.name) private transactions: Model<FinanceTransaction>,
    private readonly audit: AuditService,
  ) {}

  listImports(month?: string) {
    if (month && !/^\\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
    return this.imports.find(month ? { month } : {}).sort({ createdAt: -1 }).limit(100).lean();
  }

  async getImport(importId: string) {
    const item = await this.imports.findOne({ importId }).lean();
    if (!item) throw new NotFoundException('Statement import not found');
    const rows = await this.rows.find({ importId }).sort({ rowNumber: 1 }).limit(5000).lean();
    const summary = {
      total: rows.length,
      matched: rows.filter((r: any) => r.matchStatus === 'Matched').length,
      suggested: rows.filter((r: any) => r.matchStatus === 'Suggested').length,
      unmatched: rows.filter((r: any) => r.matchStatus === 'Unmatched').length,
      ignored: rows.filter((r: any) => r.matchStatus === 'Ignored').length,
      duplicateLike: rows.filter((r: any) => r.matchReason === 'Possible duplicate-like candidate').length,
    };
    return { import: item, summary, rows };
  }

  async importCsv(dto: ImportStatementDto, actor: string) {
    const parsed = this.parseCsv(dto.csvText);
    if (!parsed.length) throw new BadRequestException('CSV contains no data rows');
    if (parsed.length > 5000) throw new BadRequestException('A single import is limited to 5,000 data rows');
    const headers = parsed[0].map(h => this.normalise(h));
    const findHeader = (names: string[]) => headers.findIndex(h => names.includes(h));
    const dateIndex = findHeader(['date', 'transactiondate', 'valuedate', 'bookingdate']);
    const amountIndex = findHeader(['amount', 'amountugx', 'value']);
    const descriptionIndex = findHeader(['description', 'details', 'narration', 'merchant', 'payee']);
    const referenceIndex = findHeader(['reference', 'transactionreference', 'ref', 'transactionid']);
    const directionIndex = findHeader(['direction', 'type', 'debitcredit']);
    if ([dateIndex, amountIndex, descriptionIndex].some(i => i < 0)) {
      throw new BadRequestException('CSV must include Date, Amount and Description columns. Optional columns: Direction and Reference.');
    }

    const [year, monthNumber] = dto.month.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
    const converted: any[] = [];
    for (let i = 1; i < parsed.length; i++) {
      const cells = parsed[i];
      if (!cells.some(c => c.trim())) continue;
      const date = new Date(cells[dateIndex]);
      const amountText = String(cells[amountIndex] || '').replace(/[\\s,£$€]/g, '');
      const amount = Number(amountText);
      if (!Number.isFinite(date.getTime()) || date < monthStart || date >= monthEnd) {
        throw new BadRequestException(`Invalid date or date outside selected month on CSV row ${i + 1}`);
      }
      if (!Number.isFinite(amount) || amount === 0) throw new BadRequestException(`Invalid non-zero amount on CSV row ${i + 1}`);
      let direction: 'Income' | 'Expense';
      if (directionIndex >= 0) {
        const d = this.normalise(cells[directionIndex]);
        if (['income', 'credit', 'cr', 'deposit'].includes(d)) direction = 'Income';
        else if (['expense', 'debit', 'dr', 'withdrawal', 'payment'].includes(d)) direction = 'Expense';
        else throw new BadRequestException(`Unsupported direction on CSV row ${i + 1}`);
      } else {
        direction = amount > 0 ? 'Income' : 'Expense';
      }
      const absAmount = Math.abs(amount);
      const description = String(cells[descriptionIndex] || '').trim();
      const reference = referenceIndex >= 0 ? String(cells[referenceIndex] || '').trim() : '';
      if (!description) throw new BadRequestException(`Missing description on CSV row ${i + 1}`);
      const dateKey = date.toISOString().slice(0, 10);
      const candidates = await this.transactions.find({
        date: { $gte: new Date(dateKey + 'T00:00:00.000Z'), $lt: new Date(new Date(dateKey + 'T00:00:00.000Z').getTime() + 86400000) },
        amountUgx: absAmount,
        direction,
      }).limit(20).lean();
      let matchStatus = 'Unmatched';
      let suggestedTransactionId: string | undefined;
      let matchReason = 'No exact date, amount and direction match';
      if (candidates.length === 1) {
        matchStatus = 'Suggested';
        suggestedTransactionId = String(candidates[0]._id);
        matchReason = 'Exact date, amount and direction match; owner confirmation required';
      } else if (candidates.length > 1) {
        matchReason = 'Multiple exact candidates; manual selection required';
      } else {
        const dupes = await this.transactions.find({ amountUgx: absAmount, direction }).limit(20).lean();
        if (dupes.length) matchReason = 'Possible duplicate-like candidate';
      }
      converted.push({
        importId: '', rowNumber: i + 1, date, amountUgx: absAmount, direction, description,
        reference: reference || undefined, matchStatus, suggestedTransactionId, matchReason,
      });
    }
    if (!converted.length) throw new BadRequestException('CSV contains no valid data rows');
    const importId = randomUUID();
    const createdImport = await this.imports.create({
      importId, accountName: dto.accountName.trim(), accountType: dto.accountType, month: dto.month,
      fileName: dto.fileName, uploadedBy: actor, status: 'Imported', rowCount: converted.length,
    });
    try {
      await this.rows.insertMany(converted.map(r => ({ ...r, importId })), { ordered: true });
    } catch (e) {
      await this.imports.deleteOne({ importId });
      throw e;
    }
    await this.audit.record(actor, 'STATEMENT_IMPORTED', 'StatementImport', importId,
      `Imported ${converted.length} statement rows for ${dto.accountName}`, { month: dto.month, rowCount: converted.length, fileName: dto.fileName });
    return this.getImport(importId);
  }

  async decide(importId: string, rowId: string, decision: string, transactionId: string | undefined, actor: string) {
    const row = await this.rows.findOne({ _id: rowId, importId });
    if (!row) throw new NotFoundException('Statement row not found');
    if (row.matchStatus === 'Matched') throw new BadRequestException('This statement row is already matched');
    if (decision === 'confirm') {
      if (!transactionId) throw new BadRequestException('Select a finance transaction to confirm');
      const tx = await this.transactions.findById(transactionId).lean();
      if (!tx) throw new NotFoundException('Finance transaction not found');
      if (tx.direction !== row.direction || Number(tx.amountUgx) !== Number(row.amountUgx)) {
        throw new BadRequestException('Selected transaction amount or direction does not match the statement row');
      }
      const other = await this.rows.findOne({ importId, matchedTransactionId: transactionId, matchStatus: 'Matched' });
      if (other) throw new BadRequestException('This finance transaction is already matched to another row in this import');
      row.matchStatus = 'Matched';
      row.matchedTransactionId = transactionId;
      row.matchReason = 'Owner-confirmed match';
    } else if (decision === 'reject') {
      row.matchStatus = 'Unmatched';
      row.suggestedTransactionId = undefined;
      row.matchReason = 'Suggested match rejected by owner';
    } else if (decision === 'ignore') {
      row.matchStatus = 'Ignored';
      row.matchReason = 'Owner marked row as outside matching scope';
    } else {
      throw new BadRequestException('Unsupported decision');
    }
    await row.save();
    await this.audit.record(actor, `STATEMENT_ROW_${decision.toUpperCase()}`, 'StatementRow', String(row._id),
      `${decision} statement row ${row.rowNumber} in import ${importId}`, { importId, transactionId: transactionId || null });
    return this.getImport(importId);
  }

  async candidates(importId: string, rowId: string) {
    const row: any = await this.rows.findOne({ _id: rowId, importId }).lean();
    if (!row) throw new NotFoundException('Statement row not found');
    return this.transactions.find({
      direction: row.direction,
      amountUgx: row.amountUgx,
      date: { $gte: new Date(new Date(row.date).toISOString().slice(0, 10) + 'T00:00:00.000Z'), $lt: new Date(new Date(new Date(row.date).toISOString().slice(0, 10) + 'T00:00:00.000Z').getTime() + 86400000) },
    }).limit(20).lean();
  }

  private normalise(value: string) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private parseCsv(input: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === '"') {
        if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\\n' || ch === '\\r') && !quoted) {
        if (ch === '\\r' && input[i + 1] === '\\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (quoted) throw new BadRequestException('CSV has an unclosed quoted field');
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
  }
}
