import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialInvestigation } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinanceTransaction } from '../finance/finance.schema';
import { StatementImport, StatementRow } from '../statement-matching/statement-matching.schema';

@Injectable()
export class FinancialGovernanceService {
  constructor(
    @InjectModel(FinancialInvestigation.name) private readonly investigations: Model<FinancialInvestigation>,
    @InjectModel(FinancialReconciliation.name) private readonly reconciliations: Model<FinancialReconciliation>,
    @InjectModel(FinanceTransaction.name) private readonly transactions: Model<FinanceTransaction>,
    @InjectModel(StatementImport.name) private readonly imports: Model<StatementImport>,
    @InjectModel(StatementRow.name) private readonly rows: Model<StatementRow>,
  ) {}

  async getScorecard(requestedMonth?: string) {
    const month = requestedMonth || new Date().toISOString().slice(0, 7);
    if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const now = new Date();
    const [investigations, reconciliationDocs, transactionDocs, importDocs] = await Promise.all([
      this.investigations.find({ month }).sort({ dueDate: 1 }).limit(1000).lean(),
      this.reconciliations.find({ month }).sort({ accountName: 1 }).limit(500).lean(),
      this.transactions.find({ date: { $gte: start, $lt: end } }).sort({ date: -1 }).limit(2000).lean(),
      this.imports.find({ month }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const importIds = importDocs.map((x: any) => x.importId);
    const statementRows = importIds.length
      ? await this.rows.find({ importId: { $in: importIds } }).sort({ date: -1 }).limit(5000).lean()
      : [];
    const active = investigations.filter((x: any) => !['Resolved', 'Closed - reviewed'].includes(x.status));
    const overdue = active.filter((x: any) => x.dueDate && new Date(x.dueDate) < now);
    const closed = investigations.filter((x: any) => ['Resolved', 'Closed - reviewed'].includes(x.status));
    const durations = closed.filter((x: any) => x.createdAt && x.resolvedAt)
      .map((x: any) => Math.max(0, new Date(x.resolvedAt).getTime() - new Date(x.createdAt).getTime()) / 86400000);
    const unresolvedRecon = reconciliationDocs.filter((x: any) => x.status !== 'Matched' || !x.reviewed);
    const matched = statementRows.filter((x: any) => x.matchStatus === 'Matched').length;
    const eligibleRows = statementRows.filter((x: any) => x.matchStatus !== 'Ignored').length;
    const missingReceipts = transactionDocs.filter((x: any) => x.direction !== 'Transfer' && !String(x.receiptReference || '').trim()).length;
    const duplicateBuckets = new Map<string, number>();
    for (const t of transactionDocs as any[]) {
      const key = [new Date(t.date).toISOString().slice(0,10), t.direction, Number(t.amountUgx), String(t.description || '').toLowerCase().replace(/\\s+/g,' ').trim()].join('|');
      duplicateBuckets.set(key, (duplicateBuckets.get(key) || 0) + 1);
    }
    const duplicateGroups = [...duplicateBuckets.values()].filter(n => n > 1).length;
    const capWarnings = [];
    if (transactionDocs.length === 2000) capWarnings.push('Ledger query reached 2,000 records; totals may be incomplete.');
    if (importDocs.length === 100) capWarnings.push('Statement import query reached 100 imports; matching metrics may be incomplete.');
    if (statementRows.length === 5000) capWarnings.push('Statement row query reached 5,000 rows; matching metrics may be incomplete.');
    if (investigations.length === 1000) capWarnings.push('Investigation query reached 1,000 records.');
    if (reconciliationDocs.length === 500) capWarnings.push('Reconciliation query reached 500 records.');
    return {
      month, generatedAt: now.toISOString(),
      summary: {
        investigations: investigations.length,
        outstandingInvestigations: active.length,
        overdueInvestigations: overdue.length,
        resolvedInvestigations: closed.length,
        averageResolutionDays: durations.length ? Math.round((durations.reduce((a,b)=>a+b,0)/durations.length)*10)/10 : 0,
        reconciliations: reconciliationDocs.length,
        reconciliationsNeedingAttention: unresolvedRecon.length,
        ledgerTransactions: transactionDocs.length,
        missingReceiptReferences: missingReceipts,
        possibleDuplicateGroups: duplicateGroups,
        statementImports: importDocs.length,
        statementRows: statementRows.length,
        matchedStatementRows: matched,
        statementRowsEligibleForMatching: eligibleRows,
        matchingRatePercent: eligibleRows ? Math.round((matched/eligibleRows)*1000)/10 : 0,
      },
      investigationQueue: active.slice(0,100).map((x: any) => ({
        investigationId: x.investigationId, title: x.title, priority: x.priority, status: x.status,
        assignedTo: x.assignedTo, dueDate: x.dueDate, overdue: !!x.dueDate && new Date(x.dueDate) < now,
      })),
      reconciliationQueue: unresolvedRecon.slice(0,100).map((x: any) => ({
        accountName: x.accountName, accountType: x.accountType, status: x.status,
        reviewed: !!x.reviewed, closingDifferenceUgx: x.closingDifferenceUgx,
      })),
      statementStatusCounts: ['Matched','Suggested','Unmatched','Ignored'].map(status => ({
        status, count: statementRows.filter((x: any) => x.matchStatus === status).length,
      })),
      dataLimitsReached: capWarnings.length > 0,
      warnings: capWarnings,
      interpretation: [
        'This scorecard summarises records stored in ForestOS; it is not an audited financial statement.',
        'Missing receipts and duplicate-like groups are control prompts, not proof of fraud or loss.',
        'Matching rate excludes rows marked Ignored and is based on the statement rows retrieved for this month.',
        'Average resolution days uses closed investigations with both creation and resolution timestamps.',
        'The month filter uses the record month for investigations/reconciliations/imports and UTC transaction dates for ledger entries.',
      ],
    };
  }
}
