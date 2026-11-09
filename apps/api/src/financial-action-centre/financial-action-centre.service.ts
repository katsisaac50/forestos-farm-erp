import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { FinancialInvestigation } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { UpdateActionDto } from './update-action.dto';
import { FinancialAction } from './financial-action.schema';

@Injectable()
export class FinancialActionCentreService {
  constructor(
    @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
    @InjectModel(FinancialInvestigation.name) private readonly investigations: Model<FinancialInvestigation>,
    @InjectModel(FinancialReconciliation.name) private readonly reconciliations: Model<FinancialReconciliation>,
  ) {}

  async list(requestedMonth?: string, status?: string) {
    const month = requestedMonth || new Date().toISOString().slice(0, 7);
    if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
    const allowed = ['Open', 'In progress', 'Awaiting verification', 'Completed'];
    if (status && !allowed.includes(status)) throw new BadRequestException('Invalid action status');
    await this.seedActions(month);
    const query: Record<string, any> = { month };
    if (status) query.status = status;
    return this.actions.find(query).sort({ priority: -1, dueDate: 1, createdAt: -1 }).limit(500).lean();
  }

  private async seedActions(month: string) {
    const [investigations, reconciliations] = await Promise.all([
      this.investigations.find({ month, status: { $nin: ['Resolved', 'Closed - reviewed'] } }).limit(1000).lean(),
      this.reconciliations.find({ month }).limit(500).lean(),
    ]);
    for (const x of investigations as any[]) {
      const actionId = `ACT-${String(x.investigationId || randomUUID()).replace(/[^a-zA-Z0-9-]/g, '').slice(-32)}`;
      const status = x.dueDate && new Date(x.dueDate) < new Date() ? 'Open' : 'Open';
      await this.actions.updateOne(
        { sourceType: 'Investigation', sourceReference: String(x.investigationId) },
        { $setOnInsert: {
          actionId, sourceType: 'Investigation', sourceReference: String(x.investigationId), month,
          title: `Resolve investigation: ${x.title}`, description: x.description || 'Review and resolve this financial investigation.',
          priority: ['Low','Medium','High','Critical'].includes(x.priority) ? x.priority : 'Medium',
          status, assignedTo: x.assignedTo || '', dueDate: x.dueDate || undefined,
          history: [{ at: new Date(), event: 'Created from outstanding investigation' }],
        } },
        { upsert: true },
      );
    }
    for (const x of reconciliations as any[]) {
      if (x.status === 'Matched' && x.reviewed) continue;
      const ref = `${x.accountName}-${month}`;
      const actionId = `ACT-REC-${Buffer.from(ref).toString('hex').slice(0, 24)}`;
      await this.actions.updateOne(
        { sourceType: 'Reconciliation', sourceReference: ref },
        { $setOnInsert: {
          actionId, sourceType: 'Reconciliation', sourceReference: ref, month,
          title: `Review reconciliation: ${x.accountName}`, description: `Reconciliation status: ${x.status}; closing difference: ${x.closingDifferenceUgx ?? 'not recorded'} UGX.`,
          priority: Math.abs(Number(x.closingDifferenceUgx) || 0) > 1 ? 'High' : 'Medium',
          status: 'Open', assignedTo: '', history: [{ at: new Date(), event: 'Created from reconciliation needing attention' }],
        } },
        { upsert: true },
      );
    }
  }

  async update(actionId: string, dto: UpdateActionDto) {
    const action = await this.actions.findOne({ actionId });
    if (!action) throw new NotFoundException('Financial action not found. Refresh the action centre to generate actions from current source records.');
    const previousStatus = action.status;
    if (dto.status === 'Completed' && !String(dto.verificationNote || action.verificationNote || '').trim()) {
      throw new BadRequestException('A verification note is required before completing an action.');
    }
    if (dto.status === 'Completed' && dto.verificationNote) action.verificationNote = dto.verificationNote.trim();
    if (dto.status && dto.status !== previousStatus) {
      action.history.push({ at: new Date(), event: 'Status changed', from: previousStatus, to: dto.status });
      action.status = dto.status;
      if (dto.status === 'Completed') {
        action.completedAt = new Date();
        action.completedBy = 'owner';
      } else {
        action.completedAt = undefined;
        action.completedBy = undefined;
      }
    }
    if (dto.actionNote !== undefined) action.actionNote = dto.actionNote.trim();
    if (dto.assignedTo !== undefined) action.assignedTo = dto.assignedTo.trim();
    if (dto.verificationNote !== undefined && dto.status !== 'Completed') action.verificationNote = dto.verificationNote.trim();
    action.history.push({ at: new Date(), event: 'Action updated' });
    await action.save();
    return action;
  }
}
