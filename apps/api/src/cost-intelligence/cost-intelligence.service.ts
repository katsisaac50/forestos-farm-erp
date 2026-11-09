import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CostBudgetPlan, CostAllocation } from './cost-intelligence.schema';

@Injectable()
export class CostIntelligenceService {
  constructor(
    @InjectModel(CostBudgetPlan.name) private plans: Model<CostBudgetPlan>,
    @InjectModel(CostAllocation.name) private allocations: Model<CostAllocation>,
    private audit: AuditService,
  ) {}

  async dashboard() {
    const [plans, allocations] = await Promise.all([
      this.plans.find().sort({ periodStart: -1 }).lean(),
      this.allocations.find().sort({ date: -1 }).lean(),
    ]);
    const rows = plans.map((p: any) => {
      const linked = allocations.filter((a: any) => a.planId === String(p._id));
      const actualUgx = linked.reduce((s: number, a: any) => s + Number(a.amountUgx || 0), 0);
      const varianceUgx = Number(p.budgetUgx || 0) - actualUgx;
      return { ...p, actualUgx, varianceUgx, variancePercent: Number(p.budgetUgx) > 0 ? (varianceUgx / Number(p.budgetUgx)) * 100 : null, allocationCount: linked.length };
    });
    const totalBudgetUgx = rows.reduce((s: number, p: any) => s + Number(p.budgetUgx || 0), 0);
    const totalPlannedActualUgx = rows.reduce((s: number, p: any) => s + Number(p.actualUgx || 0), 0);
    const unassignedAllocationsUgx = allocations.filter((a: any) => !a.planId).reduce((s: number, a: any) => s + Number(a.amountUgx || 0), 0);
    return { plans: rows, allocations, totalBudgetUgx, totalPlannedActualUgx, unassignedAllocationsUgx, totalAllocationsUgx: allocations.reduce((s: number, a: any) => s + Number(a.amountUgx || 0), 0) };
  }

  async listPlans() { return this.plans.find().sort({ periodStart: -1 }).lean(); }
  async createPlan(dto: any, user: any) {
    if (!dto.budgetCode?.trim() || !dto.name?.trim() || !dto.periodStart || !dto.periodEnd || !dto.activity?.trim()) throw new BadRequestException('Budget code, name, period dates and activity are required.');
    if (dto.periodEnd < dto.periodStart) throw new BadRequestException('Period end must be on or after period start.');
    const amount = Number(dto.budgetUgx);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Budget must be a valid non-negative UGX amount.');
    if (await this.plans.findOne({ budgetCode: dto.budgetCode.trim() }).lean()) throw new BadRequestException('Budget code already exists.');
    const row: any = await this.plans.create({ ...dto, budgetCode: dto.budgetCode.trim(), budgetUgx: amount, plannedOutputQuantity: dto.plannedOutputQuantity === '' || dto.plannedOutputQuantity == null ? undefined : Number(dto.plannedOutputQuantity), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'cost_budget_plan', String(row._id), `Created budget plan ${row.budgetCode}`);
    return row;
  }
  async listAllocations(planId?: string) { return this.allocations.find(planId ? { planId } : {}).sort({ date: -1 }).lean(); }
  async createAllocation(dto: any, user: any) {
    if (!dto.activity?.trim() || !dto.category || !dto.date) throw new BadRequestException('Activity, category and date are required.');
    const amount = Number(dto.amountUgx);
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('Cost amount must be a valid non-negative UGX amount.');
    if (dto.planId && !(await this.plans.findById(dto.planId).lean())) throw new BadRequestException('Selected budget plan was not found.');
    const sourceModule = dto.sourceModule || 'manual';
    if (sourceModule !== 'manual' && !dto.sourceReference?.trim()) throw new BadRequestException('Enter a source reference for non-manual allocations.');
    if (sourceModule !== 'manual' && dto.sourceReference?.trim()) {
      const duplicate = await this.allocations.findOne({ sourceModule, sourceReference: dto.sourceReference.trim() }).lean();
      if (duplicate) throw new BadRequestException('This source module and reference have already been allocated. Check for duplicate costs.');
    }
    const row: any = await this.allocations.create({ ...dto, amountUgx: amount, sourceModule, sourceReference: dto.sourceReference?.trim() || undefined, recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'cost_allocation', String(row._id), `Recorded cost allocation ${row.category}: UGX ${amount}`, { sourceModule, planId: dto.planId || null });
    return row;
  }
}
