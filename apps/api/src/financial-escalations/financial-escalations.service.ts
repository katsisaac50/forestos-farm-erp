import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { FinancialEscalation } from './financial-escalations.schema';
import { FinancialInvestigation } from '../financial-investigations/financial-investigation.schema';
import { FinancialAction } from '../financial-action-centre/financial-action.schema';
import { FinancialEvidence } from '../financial-evidence/financial-evidence.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { UpdateEscalationDto } from './update-escalation.dto';

@Injectable()
export class FinancialEscalationsService {
 constructor(
  @InjectModel(FinancialEscalation.name) private readonly escalations: Model<FinancialEscalation>,
  @InjectModel(FinancialInvestigation.name) private readonly investigations: Model<FinancialInvestigation>,
  @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
  @InjectModel(FinancialEvidence.name) private readonly evidence: Model<FinancialEvidence>,
  @InjectModel(FinancialReconciliation.name) private readonly reconciliations: Model<FinancialReconciliation>,
 ) {}

 async list(requestedMonth?: string, status?: string) {
  const month = requestedMonth || new Date().toISOString().slice(0,7);
  this.validateMonth(month);
  if (status && !['Open','Acknowledged','Action required','Resolved'].includes(status)) throw new BadRequestException('Invalid escalation status');
  await this.refreshEscalations(month);
  const query: Record<string, any> = { month };
  if (status) query.status = status;
  return this.escalations.find(query).sort({ priority: -1, dueDate: 1, createdAt: -1 }).limit(1000).lean();
 }

 private async upsert(sourceType: string, sourceReference: string, month: string, title: string, reason: string, priority: string, dueDate?: Date) {
  const existing = await this.escalations.findOne({ sourceType, sourceReference });
  if (existing) {
   // Do not overwrite human workflow status or notes during a refresh.
   if (existing.status !== 'Resolved') {
    existing.title = title; existing.reason = reason; existing.priority = priority;
    if (dueDate) existing.dueDate = dueDate;
    await existing.save();
   }
   return;
  }
  const escalationId = `ESC-${randomUUID()}`;
  await this.escalations.create({
   escalationId, month, sourceType, sourceReference, title, reason, priority, status: 'Open', dueDate,
   history: [{ at: new Date(), event: 'Escalation created from source control condition' }],
  });
 }

 private async refreshEscalations(month: string) {
  const now = new Date();
  const [investigations, actions, evidence, reconciliations] = await Promise.all([
   this.investigations.find({ month, status: { $nin: ['Resolved','Closed - reviewed'] } }).limit(1000).lean(),
   this.actions.find({ month, status: { $ne: 'Completed' } }).limit(1000).lean(),
   this.evidence.find({ month, reviewStatus: { $in: ['Rejected','Needs more information'] } }).limit(1000).lean(),
   this.reconciliations.find({ month, $or: [{ status: { $ne: 'Matched' } }, { reviewed: { $ne: true } }] }).limit(500).lean(),
  ]);
  for (const x of investigations as any[]) {
   const overdue = x.dueDate && new Date(x.dueDate) < now;
   const critical = x.priority === 'Critical';
   if (overdue || critical) await this.upsert('Investigation', String(x.investigationId), month,
    `Investigation requires escalation: ${x.title}`, overdue ? 'Investigation is past its due date.' : 'Investigation has Critical priority.',
    critical ? 'Critical' : 'High', x.dueDate ? new Date(x.dueDate) : undefined);
  }
  for (const x of actions as any[]) {
   const overdue = x.dueDate && new Date(x.dueDate) < now;
   if (overdue || x.status === 'Awaiting verification') await this.upsert('Corrective action', String(x.actionId), month,
    `Corrective action needs attention: ${x.title}`, overdue ? 'Corrective action is past its due date.' : 'Action is awaiting verification.',
    overdue ? 'High' : 'Medium', x.dueDate ? new Date(x.dueDate) : undefined);
  }
  for (const x of evidence as any[]) await this.upsert('Evidence', String(x.evidenceId), month,
   `Evidence review issue: ${x.title}`, `Evidence review status is ${x.reviewStatus}.`, 'High');
  for (const x of reconciliations as any[]) {
   const difference = Math.abs(Number(x.closingDifferenceUgx) || 0);
   await this.upsert('Reconciliation', `${x.accountName}-${month}`, month,
    `Reconciliation requires review: ${x.accountName}`,
    `Status: ${x.status}; reviewed: ${Boolean(x.reviewed)}; absolute closing difference: ${difference} UGX.`,
    difference > 1 ? 'High' : 'Medium');
  }
 }

 async update(id: string, dto: UpdateEscalationDto) {
  const doc = await this.escalations.findOne({ escalationId: id });
  if (!doc) throw new NotFoundException('Escalation not found. Refresh the escalation centre to evaluate current source records.');
  const previous = doc.status;
  if (dto.status === 'Resolved' && !String(dto.resolutionNote || doc.resolutionNote || '').trim()) {
   throw new BadRequestException('A resolution note is required before resolving an escalation.');
  }
  if (dto.status && dto.status !== previous) {
   doc.history.push({ at: new Date(), event: 'Status changed', from: previous, to: dto.status });
   doc.status = dto.status;
   if (dto.status === 'Resolved') doc.resolvedAt = new Date();
   else doc.resolvedAt = undefined;
  }
  if (dto.assignedTo !== undefined) doc.assignedTo = dto.assignedTo.trim();
  if (dto.resolutionNote !== undefined) doc.resolutionNote = dto.resolutionNote.trim();
  doc.history.push({ at: new Date(), event: 'Escalation updated' });
  await doc.save();
  return doc;
 }

 private validateMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
 }
}
