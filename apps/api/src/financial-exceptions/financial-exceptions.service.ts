import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinanceTransaction } from '../finance/finance.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { StatementImport, StatementRow } from '../statement-matching/statement-matching.schema';

@Injectable()
export class FinancialExceptionsService {
  constructor(
    @InjectModel(FinanceTransaction.name) private tx: Model<FinanceTransaction>,
    @InjectModel(FinancialReconciliation.name) private rec: Model<FinancialReconciliation>,
    @InjectModel(StatementImport.name) private imports: Model<StatementImport>,
    @InjectModel(StatementRow.name) private rows: Model<StatementRow>,
  ) {}
  async report(month?: string) {
    const m = month || new Date().toISOString().slice(0,7);
    if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new BadRequestException('month must use YYYY-MM format');
    const [y, mm] = m.split('-').map(Number);
    const start = new Date(Date.UTC(y,mm-1,1)), end = new Date(Date.UTC(y,mm,1));
    const [txs, recs, imports] = await Promise.all([
      this.tx.find({date:{$gte:start,$lt:end}}).sort({date:1}).limit(2000).lean(),
      this.rec.find({month:m}).limit(300).lean(),
      this.imports.find({month:m}).sort({createdAt:-1}).limit(100).lean(),
    ]);
    const ids = imports.map((x:any)=>x.importId);
    const rows:any[] = ids.length ? await this.rows.find({importId:{$in:ids}}).limit(5000).lean() : [];
    const missing = txs.filter((t:any)=>!String(t.receiptReference||'').trim());
    const groups = new Map<string,any[]>();
    for (const t of txs as any[]) {
      const k = `${t.direction}|${Number(t.amountUgx)}|${new Date(t.date).toISOString().slice(0,10)}|${String(t.description||'').trim().toLowerCase()}`;
      if (!groups.has(k)) groups.set(k,[]);
      groups.get(k)!.push(t);
    }
    const duplicates = [...groups.entries()].filter(([k,v])=>v.length>1 && Number(k.split('|')[1])>0).map(([fingerprint,v])=>({
      fingerprint,count:v.length,reason:'Same date, amount, direction and description; review manually.',
      transactions:v.map((t:any)=>({id:String(t._id),transactionId:t.transactionId,date:t.date,direction:t.direction,amountUgx:t.amountUgx,description:t.description,receiptReference:t.receiptReference||''}))
    }));
    const recExceptions = recs.filter((r:any)=>Math.abs(Number(r.closingDifferenceUgx)||0)>1 || r.status==='Needs review' || !r.reviewed);
    const importSummary = imports.map((i:any)=>{
      const rs=rows.filter((r:any)=>r.importId===i.importId);
      return {importId:i.importId,accountName:i.accountName,accountType:i.accountType,fileName:i.fileName,rowCount:i.rowCount,
        matched:rs.filter((r:any)=>r.matchStatus==='Matched').length,
        suggested:rs.filter((r:any)=>r.matchStatus==='Suggested').length,
        unmatched:rs.filter((r:any)=>r.matchStatus==='Unmatched').length,
        ignored:rs.filter((r:any)=>r.matchStatus==='Ignored').length};
    });
    const unresolved=rows.filter((r:any)=>r.matchStatus==='Unmatched'||r.matchStatus==='Suggested');
    return {
      month:m,generatedAt:new Date().toISOString(),
      dataLimits:{transactionsCapped:txs.length===2000,importsCapped:imports.length===100,statementRowsCapped:rows.length===5000},
      summary:{ledgerTransactions:txs.length,missingReceiptCount:missing.length,duplicateCandidateGroups:duplicates.length,
        statementImports:imports.length,statementUnmatchedCount:unresolved.filter((r:any)=>r.matchStatus==='Unmatched').length,
        statementSuggestedCount:unresolved.filter((r:any)=>r.matchStatus==='Suggested').length,
        reconciliationCount:recs.length,reconciliationNeedsAttention:recExceptions.length,
        reconciliationUnreviewedCount:recs.filter((r:any)=>!r.reviewed).length},
      missingReceipts:missing.map((t:any)=>({id:String(t._id),transactionId:t.transactionId,date:t.date,direction:t.direction,amountUgx:t.amountUgx,category:t.category,description:t.description})),
      duplicateCandidates:duplicates,
      statementImports:importSummary,
      unmatchedStatementRows:unresolved.map((r:any)=>({id:String(r._id),importId:r.importId,rowNumber:r.rowNumber,date:r.date,amountUgx:r.amountUgx,direction:r.direction,description:r.description,reference:r.reference||'',matchStatus:r.matchStatus,matchReason:r.matchReason||''})),
      reconciliationExceptions:recExceptions.map((r:any)=>({id:String(r._id),accountName:r.accountName,accountType:r.accountType,month:r.month,closingDifferenceUgx:r.closingDifferenceUgx,status:r.status,reviewed:r.reviewed,notes:r.notes||''})),
      notes:['Indicators are for human review, not findings of fraud.','Missing receipt reference does not prove a receipt is absent elsewhere.','Legitimate recurring transactions may appear as duplicate candidates.','Data caps may make exception lists incomplete.','This is a management report, not audited accounting or bank reconciliation.']
    };
  }
}
