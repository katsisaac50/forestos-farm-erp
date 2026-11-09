import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { FinancialAuditEntry } from './financial-audit-trail.schema';
import { FinancialEvidence } from '../financial-evidence/financial-evidence.schema';
import { FinancialAction } from '../financial-action-centre/financial-action.schema';
import { FinancialInvestigation } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinanceTransaction } from '../finance/finance.schema';

@Injectable()
export class FinancialAuditTrailService {
 constructor(
  @InjectModel(FinancialAuditEntry.name) private readonly entries: Model<FinancialAuditEntry>,
  @InjectModel(FinancialEvidence.name) private readonly evidence: Model<FinancialEvidence>,
  @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
  @InjectModel(FinancialInvestigation.name) private readonly investigations: Model<FinancialInvestigation>,
  @InjectModel(FinancialReconciliation.name) private readonly reconciliations: Model<FinancialReconciliation>,
  @InjectModel(FinanceTransaction.name) private readonly transactions: Model<FinanceTransaction>,
 ) {}

 async list(requestedMonth?: string, entityType?: string, entityReference?: string) {
  const month = requestedMonth || new Date().toISOString().slice(0,7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
  const query: Record<string, any> = { month };
  if (entityType) query.entityType = entityType;
  if (entityReference) query.entityReference = entityReference;
  await this.syncSnapshotEvents(month);
  return this.entries.find(query).sort({ occurredAt: -1, createdAt: -1 }).limit(2000).lean();
 }

 private async syncSnapshotEvents(month: string) {
  const [transactions, investigations, actions, evidence, reconciliations] = await Promise.all([
   this.transactions.find({ date: { $gte: new Date(`${month}-01T00:00:00.000Z`), $lt: new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7)), 1)) } }).limit(2000).lean(),
   this.investigations.find({ month }).limit(1000).lean(),
   this.actions.find({ month }).limit(1000).lean(),
   this.evidence.find({ month }).limit(1000).lean(),
   this.reconciliations.find({ month }).limit(500).lean(),
  ]);
  const docs: any[] = [];
  for (const x of transactions as any[]) docs.push({ entityType:'Transaction', entityReference:String(x.transactionId), eventType:'Transaction snapshot', summary:`${x.direction} ${x.amountUgx} UGX — ${x.description || x.category || 'No description'}`, occurredAt:x.date, details:{amountUgx:x.amountUgx,direction:x.direction,category:x.category,receiptReference:x.receiptReference} });
  for (const x of investigations as any[]) {
   docs.push({ entityType:'Investigation', entityReference:String(x.investigationId), eventType:'Investigation snapshot', summary:x.title || 'Financial investigation', sourceStatus:x.status, occurredAt:x.updatedAt || x.createdAt, details:{priority:x.priority,assignedTo:x.assignedTo,dueDate:x.dueDate,resolutionNote:x.resolutionNote} });
   for (const h of (x.history || [])) docs.push({ entityType:'Investigation', entityReference:String(x.investigationId), eventType:String(h.event || 'Investigation history'), summary:String(h.note || h.event || 'Investigation update'), occurredAt:h.at ? new Date(h.at) : x.updatedAt, details:{history:h} });
  }
  for (const x of actions as any[]) {
   docs.push({ entityType:'Corrective action', entityReference:String(x.actionId), eventType:'Action snapshot', summary:x.title || 'Corrective action', sourceStatus:x.status, actionStatus:x.status, occurredAt:x.updatedAt || x.createdAt, details:{priority:x.priority,assignedTo:x.assignedTo,dueDate:x.dueDate,actionNote:x.actionNote,verificationNote:x.verificationNote} });
   for (const h of (x.history || [])) docs.push({ entityType:'Corrective action', entityReference:String(x.actionId), eventType:String(h.event || 'Action history'), summary:String(h.note || h.event || 'Action update'), actionStatus:String(h.to || x.status), occurredAt:h.at ? new Date(h.at) : x.updatedAt, details:{history:h} });
  }
  for (const x of evidence as any[]) {
   docs.push({ entityType:'Evidence', entityReference:String(x.evidenceId), eventType:'Evidence snapshot', summary:x.title || 'Evidence reference', evidenceStatus:x.reviewStatus, reviewer:x.reviewedBy, occurredAt:x.updatedAt || x.createdAt, details:{evidenceType:x.evidenceType,reference:x.reference,sourceActionId:x.sourceActionId,reviewNote:x.reviewNote} });
   for (const h of (x.history || [])) docs.push({ entityType:'Evidence', entityReference:String(x.evidenceId), eventType:String(h.event || 'Evidence history'), summary:String(h.note || h.event || 'Evidence update'), evidenceStatus:String(h.to || x.reviewStatus), reviewer:x.reviewedBy, occurredAt:h.at ? new Date(h.at) : x.updatedAt, details:{history:h} });
  }
  for (const x of reconciliations as any[]) docs.push({ entityType:'Reconciliation', entityReference:`${x.accountName}-${month}`, eventType:'Reconciliation snapshot', summary:`${x.accountName}: ${x.status}; difference ${x.closingDifferenceUgx ?? 'not recorded'} UGX`, sourceStatus:x.status, reviewer:x.reviewedBy, occurredAt:x.updatedAt || x.createdAt, details:{accountType:x.accountType,closingDifferenceUgx:x.closingDifferenceUgx,reviewed:x.reviewed,reviewedAt:x.reviewedAt} });

  for (const d of docs) {
   const occurredAt = d.occurredAt && !Number.isNaN(new Date(d.occurredAt).getTime()) ? new Date(d.occurredAt) : new Date();
   const eventType = d.eventType;
   const identity = `${month}|${d.entityType}|${d.entityReference}|${eventType}|${occurredAt.toISOString()}|${d.summary}`;
   const auditEntryId = `AUD-${Buffer.from(identity).toString('hex').slice(0,60)}-${randomUUID().slice(0,8)}`;
   // Snapshot entries are append-only per refresh; no source record is modified.
   await this.entries.updateOne({ auditEntryId }, { $setOnInsert: {
    auditEntryId, month, entityType:d.entityType, entityReference:d.entityReference, eventType,
    summary:d.summary, sourceStatus:d.sourceStatus, evidenceStatus:d.evidenceStatus, actionStatus:d.actionStatus,
    reviewer:d.reviewer, occurredAt, details:d.details,
   } }, { upsert:true });
  }
 }
}
