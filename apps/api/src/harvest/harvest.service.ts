import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { HarvestPlan, TimberQuote, HarvestCost } from './harvest.schema';

const volumeUnits = ['m3','tonne','piece','cord','other'];
@Injectable()
export class HarvestService {
  constructor(
    @InjectModel(HarvestPlan.name) private plans: Model<HarvestPlan>,
    @InjectModel(TimberQuote.name) private quotes: Model<TimberQuote>,
    @InjectModel(HarvestCost.name) private costs: Model<HarvestCost>,
    private audit: AuditService,
  ) {}

  listPlans() { return this.plans.find().sort({ proposedStartDate: 1 }).lean(); }
  async createPlan(dto: any, user: any) {
    if (!dto.planName || !dto.blockId || !dto.proposedStartDate) throw new BadRequestException('planName, blockId and proposedStartDate are required');
    if (dto.expectedVolume !== undefined && Number(dto.expectedVolume) < 0) throw new BadRequestException('expectedVolume cannot be negative');
    if (dto.expectedVolume !== undefined && (!dto.volumeUnit || !dto.volumeSource)) throw new BadRequestException('If volume is entered, provide its unit and measurement/source method.');
    const row: any = await this.plans.create({ ...dto, expectedVolume: dto.expectedVolume === '' || dto.expectedVolume == null ? undefined : Number(dto.expectedVolume), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'harvest_plan', String(row._id), `Created harvest plan ${row.planName}`);
    return row;
  }
  async updatePlan(id: string, dto: any, user: any) {
    if (dto.expectedVolume !== undefined && dto.expectedVolume !== null && Number(dto.expectedVolume) < 0) throw new BadRequestException('expectedVolume cannot be negative');
    if (dto.expectedVolume !== undefined && dto.expectedVolume !== null && dto.expectedVolume !== '' && (!dto.volumeUnit || !dto.volumeSource)) throw new BadRequestException('If volume is entered, provide its unit and measurement/source method.');
    const row: any = await this.plans.findByIdAndUpdate(id, { ...dto, ...(dto.expectedVolume === '' ? { expectedVolume: undefined } : {}) }, { new: true, runValidators: true }).lean();
    if (!row) throw new NotFoundException('Harvest plan not found');
    await this.audit.record(user.email, 'updated', 'harvest_plan', String(row._id), `Updated harvest plan ${row.planName}`, { fields: Object.keys(dto) });
    return row;
  }
  listQuotes() { return this.quotes.find().sort({ quoteDate: -1 }).lean(); }
  async createQuote(dto: any, user: any) {
    if (!dto.buyerName || !dto.productSpecification || !dto.unit || !dto.quoteDate || dto.pricePerUnit === undefined) throw new BadRequestException('Buyer, product specification, unit, quote date and price are required');
    if (!volumeUnits.includes(dto.unit) || Number(dto.pricePerUnit) < 0) throw new BadRequestException('Check quote unit and non-negative price.');
    const row: any = await this.quotes.create({ ...dto, pricePerUnit: Number(dto.pricePerUnit), transportIncluded: Boolean(dto.transportIncluded), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'timber_quote', String(row._id), `Recorded buyer quote from ${row.buyerName}`);
    return row;
  }
  listCosts(planId?: string) { return this.costs.find(planId ? { planId } : {}).sort({ date: -1 }).lean(); }
  async createCost(dto: any, user: any) {
    if (!dto.planId || !dto.category || dto.amountUgx === undefined || !dto.date) throw new BadRequestException('planId, category, amountUgx and date are required');
    const plan = await this.plans.findById(dto.planId).lean();
    if (!plan) throw new NotFoundException('Harvest plan not found');
    if (Number(dto.amountUgx) < 0) throw new BadRequestException('Cost cannot be negative');
    const row: any = await this.costs.create({ ...dto, amountUgx: Number(dto.amountUgx), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'harvest_cost', String(row._id), `Recorded ${dto.category} planning cost`, { planId: dto.planId, amountUgx: Number(dto.amountUgx) });
    return row;
  }
  async scenario(planId: string, quoteId?: string) {
    const plan: any = await this.plans.findById(planId).lean();
    if (!plan) throw new NotFoundException('Harvest plan not found');
    const costs: any[] = await this.costs.find({ planId }).lean();
    const totalCosts = costs.reduce((sum, c) => sum + Number(c.amountUgx || 0), 0);
    let quote: any = null;
    if (quoteId) {
      quote = await this.quotes.findById(quoteId).lean();
      if (!quote) throw new NotFoundException('Timber quote not found');
    }
    const compatible = Boolean(quote && plan.expectedVolume !== undefined && plan.volumeUnit === quote.unit);
    const gross = compatible ? Number(plan.expectedVolume) * Number(quote.pricePerUnit) : null;
    return {
      plan: { id: String(plan._id), planName: plan.planName, blockId: plan.blockId, status: plan.status, readinessStatus: plan.readinessStatus },
      quote: quote ? { id: String(quote._id), buyerName: quote.buyerName, unit: quote.unit, pricePerUnit: quote.pricePerUnit, quoteDate: quote.quoteDate, expiryDate: quote.expiryDate, transportIncluded: quote.transportIncluded } : null,
      expectedVolume: plan.expectedVolume ?? null, volumeUnit: plan.volumeUnit ?? null,
      grossProceedsUgx: gross, plannedCostsUgx: totalCosts,
      estimatedMarginUgx: gross === null ? null : gross - totalCosts,
      costs: costs.map(c => ({ category: c.category, amountUgx: c.amountUgx, date: c.date, description: c.description })),
      assumptions: [
        'Volume is user-entered; ForestOS does not infer saleable volume from height or DBH.',
        'Scenario is arithmetic, not a forecast or guaranteed sale price.',
        'Costs are planning records and are not automatically posted to the finance ledger.',
        'Only compare matching volume units and product specifications. Verify quote validity, quality, measurement, transport, taxes, permits and fees.',
      ],
      compatibleUnits: compatible,
    };
  }
}
