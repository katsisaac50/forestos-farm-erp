import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { RegenerationPlan, RegenerationCost, SurvivalCheck } from './regeneration.schema';

@Injectable()
export class RegenerationService {
  constructor(
    @InjectModel(RegenerationPlan.name) private plans: Model<RegenerationPlan>,
    @InjectModel(RegenerationCost.name) private costs: Model<RegenerationCost>,
    @InjectModel(SurvivalCheck.name) private checks: Model<SurvivalCheck>,
    private audit: AuditService,
  ) {}

  listPlans() { return this.plans.find().sort({ plannedStartDate: 1 }).lean(); }
  async createPlan(dto: any, user: any) {
    if (!dto.planName || !dto.blockId || !dto.method || !dto.plannedStartDate) throw new BadRequestException('Plan name, block, method and planned start date are required.');
    const row: any = await this.plans.create({ ...dto, targetSeedlings: dto.targetSeedlings === '' || dto.targetSeedlings == null ? undefined : Number(dto.targetSeedlings), nurseryStockAvailable: dto.nurseryStockAvailable === '' || dto.nurseryStockAvailable == null ? undefined : Number(dto.nurseryStockAvailable), targetAreaAcres: dto.targetAreaAcres === '' || dto.targetAreaAcres == null ? undefined : Number(dto.targetAreaAcres), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'regeneration_plan', String(row._id), `Created regeneration plan ${row.planName}`);
    return row;
  }
  async updatePlan(id: string, dto: any, user: any) {
    const row: any = await this.plans.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean();
    if (!row) throw new NotFoundException('Regeneration plan not found');
    await this.audit.record(user.email, 'updated', 'regeneration_plan', String(row._id), `Updated regeneration plan ${row.planName}`, { fields: Object.keys(dto) });
    return row;
  }
  listCosts(planId?: string) { return this.costs.find(planId ? { planId } : {}).sort({ date: -1 }).lean(); }
  async createCost(dto: any, user: any) {
    if (!dto.planId || !dto.category || dto.amountUgx === undefined || !dto.date) throw new BadRequestException('Plan, category, amount and date are required.');
    if (Number(dto.amountUgx) < 0) throw new BadRequestException('Cost cannot be negative.');
    if (!await this.plans.findById(dto.planId).lean()) throw new NotFoundException('Regeneration plan not found');
    const row: any = await this.costs.create({ ...dto, amountUgx: Number(dto.amountUgx), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'regeneration_cost', String(row._id), `Recorded regeneration cost ${dto.category}`, { planId: dto.planId, amountUgx: Number(dto.amountUgx) });
    return row;
  }
  listChecks(planId?: string) { return this.checks.find(planId ? { planId } : {}).sort({ checkDate: -1 }).lean(); }
  async createCheck(dto: any, user: any) {
    if (!dto.planId || !dto.checkDate || dto.sampleSize === undefined || dto.liveCount === undefined || dto.deadOrMissingCount === undefined) throw new BadRequestException('Plan, date, sample size, live count and dead/missing count are required.');
    const sampleSize = Number(dto.sampleSize), liveCount = Number(dto.liveCount), dead = Number(dto.deadOrMissingCount);
    if (![sampleSize, liveCount, dead].every(Number.isFinite) || sampleSize <= 0 || liveCount < 0 || dead < 0 || liveCount + dead !== sampleSize) throw new BadRequestException('Counts must be non-negative, sample size must be positive, and live + dead/missing must equal sample size.');
    if (!await this.plans.findById(dto.planId).lean()) throw new NotFoundException('Regeneration plan not found');
    const row: any = await this.checks.create({ ...dto, sampleSize, liveCount, deadOrMissingCount: dead, recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'survival_check', String(row._id), `Recorded regeneration survival check`, { planId: dto.planId, sampleSize, liveCount, deadOrMissingCount: dead });
    return row;
  }
  async dashboard() {
    const plans: any[] = await this.plans.find().lean();
    const costs: any[] = await this.costs.find().lean();
    const checks: any[] = await this.checks.find().sort({ checkDate: 1 }).lean();
    const planRows = plans.map(p => {
      const pc = costs.filter(c => String(c.planId) === String(p._id));
      const ch = checks.filter(c => String(c.planId) === String(p._id));
      const latest = ch[ch.length - 1];
      return { ...p, recordedCostsUgx: pc.reduce((s,c) => s + Number(c.amountUgx || 0),0), costRecordCount: pc.length,
        survivalCheckCount: ch.length, latestSurvivalCheck: latest ? { checkDate: latest.checkDate, sampleSize: latest.sampleSize, liveCount: latest.liveCount, deadOrMissingCount: latest.deadOrMissingCount, survivalPercent: latest.sampleSize ? latest.liveCount / latest.sampleSize * 100 : null, replacementAction: latest.replacementAction } : null,
        seedlingsShortfall: p.targetSeedlings != null && p.nurseryStockAvailable != null ? Math.max(0, Number(p.targetSeedlings) - Number(p.nurseryStockAvailable)) : null };
    });
    return { generatedAt: new Date().toISOString(), plans: planRows,
      totals: { plans: planRows.length, activePlans: planRows.filter(p => ['in_progress','monitoring'].includes(p.status)).length, recordedCostsUgx: planRows.reduce((s,p) => s + p.recordedCostsUgx,0), plansWithoutSurvivalCheck: planRows.filter(p => !p.survivalCheckCount).length },
      notes: ['Survival percentage describes only the recorded sample, not necessarily the whole block.', 'Compare checks only when sample design, timing and counting method are reasonably consistent.', 'Cost records are separate from the finance ledger and are not automatically posted there.'] };
  }
}
