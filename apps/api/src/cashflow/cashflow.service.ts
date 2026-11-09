import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CashPosition, CashflowPlan, CapitalDecision } from './cashflow.schema';

@Injectable()
export class CashflowService {
  constructor(
    @InjectModel(CashPosition.name) private positions: Model<CashPosition>,
    @InjectModel(CashflowPlan.name) private plans: Model<CashflowPlan>,
    @InjectModel(CapitalDecision.name) private decisions: Model<CapitalDecision>,
    private audit: AuditService,
  ) {}

  async dashboard() {
    const [positions, plans, decisions] = await Promise.all([
      this.positions.find().sort({ asOfDate: -1, createdAt: -1 }).limit(1).lean(),
      this.plans.find().sort({ periodStart: 1 }).lean(),
      this.decisions.find().sort({ decisionDate: -1 }).lean(),
    ]);
    const latest = positions[0] as any;
    const plannedInflowsUgx = (plans as any[]).filter(p => p.category === 'inflow' && !['cancelled','completed'].includes(p.status)).reduce((s,p)=>s+Number(p.plannedAmountUgx||0),0);
    const plannedOutflowsUgx = (plans as any[]).filter(p => p.category === 'outflow' && !['cancelled','completed'].includes(p.status)).reduce((s,p)=>s+Number(p.plannedAmountUgx||0),0);
    const plannedReservesUgx = (plans as any[]).filter(p => p.category === 'reserve' && !['cancelled','completed'].includes(p.status)).reduce((s,p)=>s+Number(p.plannedAmountUgx||0),0);
    const plannedInvestmentsUgx = (plans as any[]).filter(p => p.category === 'investment' && !['cancelled','completed'].includes(p.status)).reduce((s,p)=>s+Number(p.plannedAmountUgx||0),0);
    const netPlannedMovementUgx = plannedInflowsUgx - plannedOutflowsUgx - plannedReservesUgx - plannedInvestmentsUgx;
    const draftDecisions = (decisions as any[]).filter(d => ['draft','approved'].includes(d.status));
    return {
      latestCashPosition: latest || null,
      plans,
      decisions,
      totals: { plannedInflowsUgx, plannedOutflowsUgx, plannedReservesUgx, plannedInvestmentsUgx, netPlannedMovementUgx },
      capitalDecisionSummary: {
        draftOrApprovedCount: draftDecisions.length,
        proposedAmountUgx: draftDecisions.reduce((s,d)=>s+Number(d.proposedAmountUgx||0),0),
      },
      warning: latest ? 'The cash position is a manually entered snapshot, not a live bank balance. Reconcile all accounts and pending transactions before relying on it.' : 'No opening cash position recorded. Forecasts are planning scenarios only and must not be treated as available cash.',
    };
  }

  async listPositions() { return this.positions.find().sort({ asOfDate: -1, createdAt: -1 }).lean(); }
  async createPosition(dto: any, user: any) {
    if (!dto.asOfDate || !dto.note?.trim()) throw new BadRequestException('As-of date and reconciliation note are required.');
    const amount = Number(dto.openingCashUgx);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Cash position must be a valid non-negative amount.');
    const row: any = await this.positions.create({ ...dto, openingCashUgx: amount, recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'cash_position', String(row._id), `Recorded cash position as of ${row.asOfDate}: UGX ${amount}`);
    return row;
  }
  async listPlans() { return this.plans.find().sort({ periodStart: 1 }).lean(); }
  async createPlan(dto: any, user: any) {
    if (!dto.planCode?.trim() || !dto.title?.trim() || !dto.periodStart || !dto.periodEnd || !dto.category) throw new BadRequestException('Plan code, title, dates and category are required.');
    if (dto.periodEnd < dto.periodStart) throw new BadRequestException('Period end must be on or after period start.');
    const amount = Number(dto.plannedAmountUgx);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Planned amount must be a valid non-negative UGX amount.');
    if (await this.plans.findOne({ planCode: dto.planCode.trim() }).lean()) throw new BadRequestException('Plan code already exists.');
    const row: any = await this.plans.create({ ...dto, planCode: dto.planCode.trim(), plannedAmountUgx: amount, createdBy: user.email });
    await this.audit.record(user.email, 'created', 'cashflow_plan', String(row._id), `Created cash flow plan ${row.planCode}`);
    return row;
  }
  async listDecisions() { return this.decisions.find().sort({ decisionDate: -1 }).lean(); }
  async createDecision(dto: any, user: any) {
    if (!dto.decisionCode?.trim() || !dto.decisionDate || !dto.purpose?.trim() || !dto.destination || !dto.rationale?.trim()) throw new BadRequestException('Decision code, date, purpose, destination and rationale are required.');
    const fields = ['proposedAmountUgx','protectedReserveUgx','cashAvailableUgx','otherCommittedUgx'];
    const amounts: any = {};
    for (const f of fields) {
      const n = Number(dto[f]);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${f} must be a valid non-negative amount.`);
      amounts[f] = n;
    }
    if (await this.decisions.findOne({ decisionCode: dto.decisionCode.trim() }).lean()) throw new BadRequestException('Decision code already exists.');
    const investable = Math.max(0, amounts.cashAvailableUgx - amounts.protectedReserveUgx - amounts.otherCommittedUgx);
    const row: any = await this.decisions.create({ ...dto, ...amounts, decisionCode: dto.decisionCode.trim(), status: dto.status || 'draft', recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'capital_decision', String(row._id), `Created capital allocation decision ${row.decisionCode}`, { investableCashAtEntryUgx: investable, proposedAmountUgx: amounts.proposedAmountUgx });
    return { ...row.toObject(), investableCashAtEntryUgx: investable, withinEnteredCashLimit: amounts.proposedAmountUgx <= investable };
  }
}
