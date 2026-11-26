import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { RegenerationPlan, RegenerationCost, SurvivalCheck } from './regeneration.schema';
import { RegenerationGlService } from './regeneration-gl.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';

@Injectable()
export class RegenerationService {
  private readonly logger = new Logger(RegenerationService.name);

  constructor(
    @InjectModel(RegenerationPlan.name) private plans: Model<RegenerationPlan>,
    @InjectModel(RegenerationCost.name) private costs: Model<RegenerationCost>,
    @InjectModel(SurvivalCheck.name) private checks: Model<SurvivalCheck>,
    private audit: AuditService,
    private readonly gl: RegenerationGlService,
  ) {}

  async listPlans(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.plans.find({ organizationId: context.organizationId }).sort({ plannedStartDate: -1 }).lean();
  }

  async createPlan(dto: any, user: any, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    if (!dto.planName || !dto.blockId || !dto.method || !dto.plannedStartDate)
      throw new BadRequestException('Plan name, block, method and planned start date are required.');
    const row: any = await this.plans.create({
      ...dto,
      organizationId: context.organizationId,
      targetSeedlings: dto.targetSeedlings === '' || dto.targetSeedlings == null ? undefined : Number(dto.targetSeedlings),
      nurseryStockAvailable: dto.nurseryStockAvailable === '' || dto.nurseryStockAvailable == null ? undefined : Number(dto.nurseryStockAvailable),
      targetAreaAcres: dto.targetAreaAcres === '' || dto.targetAreaAcres == null ? undefined : Number(dto.targetAreaAcres),
      createdBy: user.email,
    });
    await this.audit.record(user.email, 'created', 'regeneration_plan', String(row._id), `Created regeneration plan ${row.planName}`);
    return row;
  }

  async updatePlan(id: string, dto: any, user: any, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const row: any = await this.plans.findOneAndUpdate(
      { _id: id, organizationId: context.organizationId },
      dto,
      { new: true, runValidators: true },
    ).lean();
    if (!row) throw new NotFoundException('Regeneration plan not found');
    await this.audit.record(user.email, 'updated', 'regeneration_plan', String(row._id), `Updated regeneration plan ${row.planName}`, { fields: Object.keys(dto) });
    return row;
  }

  async listCosts(rawContext: OrganizationContext, planId?: string) {
    const context = requireOrganizationContext(rawContext);
    return this.costs
      .find(planId ? { organizationId: context.organizationId, planId } : { organizationId: context.organizationId })
      .sort({ date: -1 })
      .lean();
  }

  async createCost(dto: any, user: any, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    if (!dto.planId || !dto.category || dto.amountUgx === undefined || !dto.date)
      throw new BadRequestException('Plan, category, amount and date are required.');
    if (Number(dto.amountUgx) < 0)
      throw new BadRequestException('Cost cannot be negative.');

    const plan = await this.plans.findOne({ _id: dto.planId, organizationId: context.organizationId }).lean();
    if (!plan) throw new NotFoundException('Regeneration plan not found');

    const row: any = await this.costs.create({
      ...dto,
      organizationId: context.organizationId,
      amountUgx: Number(dto.amountUgx),
      createdBy: user.email,
    });

    // Post to GL — capitalses into biological asset
    try {
      await this.gl.postCost(context, row.toObject(), plan);
    } catch (e: any) {
      if (e?.status === 400 && /locked period/i.test(e.message)) {
        await this.costs.findByIdAndDelete(row._id);
        throw e;
      }
      this.logger.error(`GL post failed for regeneration cost ${row._id}: ${e.message}`, e.stack);
    }

    await this.audit.record(user.email, 'created', 'regeneration_cost', String(row._id), `Recorded regeneration cost ${dto.category}`, { planId: dto.planId, amountUgx: Number(dto.amountUgx) });
    return row;
  }

  async listChecks(rawContext: OrganizationContext, planId?: string) {
    const context = requireOrganizationContext(rawContext);
    return this.checks
      .find(planId ? { organizationId: context.organizationId, planId } : { organizationId: context.organizationId })
      .sort({ checkDate: -1 })
      .lean();
  }

  async createCheck(dto: any, user: any, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    if (!dto.planId || !dto.checkDate || dto.sampleSize === undefined || dto.liveCount === undefined || dto.deadOrMissingCount === undefined)
      throw new BadRequestException('Plan, date, sample size, live count and dead/missing count are required.');
    const sampleSize = Number(dto.sampleSize), liveCount = Number(dto.liveCount), dead = Number(dto.deadOrMissingCount);
    if (![sampleSize, liveCount, dead].every(Number.isFinite) || sampleSize <= 0 || liveCount < 0 || dead < 0 || liveCount + dead !== sampleSize)
      throw new BadRequestException('Counts must be non-negative, sample size must be positive, and live + dead/missing must equal sample size.');

    const plan = await this.plans.findOne({ _id: dto.planId, organizationId: context.organizationId }).lean();
    if (!plan) throw new NotFoundException('Regeneration plan not found');

    const row: any = await this.checks.create({
      ...dto,
      organizationId: context.organizationId,
      sampleSize,
      liveCount,
      deadOrMissingCount: dead,
      recordedBy: user.email,
    });
    await this.audit.record(user.email, 'created', 'survival_check', String(row._id), `Recorded regeneration survival check`, { planId: dto.planId, sampleSize, liveCount, deadOrMissingCount: dead });
    return row;
  }

  async dashboard(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const plans: any[] = await this.plans.find({ organizationId: context.organizationId }).lean();
    const costs: any[] = await this.costs.find({ organizationId: context.organizationId }).lean();
    const checks: any[] = await this.checks.find({ organizationId: context.organizationId }).sort({ checkDate: 1 }).lean();
    const planRows = plans.map(p => {
      const pc = costs.filter(c => String(c.planId) === String(p._id));
      const ch = checks.filter(c => String(c.planId) === String(p._id));
      const latest = ch[ch.length - 1];
      return {
        ...p,
        recordedCostsUgx: pc.reduce((s,c) => s + Number(c.amountUgx || 0),0),
        costRecordCount: pc.length,
        survivalCheckCount: ch.length,
        latestSurvivalCheck: latest ? {
          checkDate: latest.checkDate,
          sampleSize: latest.sampleSize,
          liveCount: latest.liveCount,
          deadOrMissingCount: latest.deadOrMissingCount,
          survivalPercent: latest.sampleSize ? latest.liveCount / latest.sampleSize * 100 : null,
          replacementAction: latest.replacementAction,
        } : null,
        seedlingsShortfall: p.targetSeedlings != null && p.nurseryStockAvailable != null
          ? Math.max(0, Number(p.targetSeedlings) - Number(p.nurseryStockAvailable))
          : null,
      };
    });
    return { generatedAt: new Date().toISOString(), plans: planRows };
  }
}