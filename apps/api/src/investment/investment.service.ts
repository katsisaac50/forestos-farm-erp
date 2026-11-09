import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { InvestmentScenario, InvestmentDecision } from './investment.schema';

@Injectable()
export class InvestmentService {
  constructor(
    @InjectModel(InvestmentScenario.name) private scenarios: Model<InvestmentScenario>,
    @InjectModel(InvestmentDecision.name) private decisions: Model<InvestmentDecision>,
    private audit: AuditService,
  ) {}

  private calculate(s: any) {
    const years = Math.max(1, Math.min(40, Math.floor(Number(s.horizonYears))));
    const initial = Number(s.initialInvestmentUgx || 0);
    const contingency = Number(s.contingencyPct || 0) / 100;
    const initialWithContingency = initial * (1 + contingency);
    const rg = Number(s.annualRevenueGrowthPct || 0) / 100;
    const cg = Number(s.annualCostGrowthPct || 0) / 100;
    const dr = Number(s.discountRatePct || 0) / 100;
    let cumulative = -initialWithContingency, npv = -initialWithContingency, discountedInflow = 0, discountedOutflow = initialWithContingency;
    let paybackYear: number | null = null;
    const yearly: any[] = [];
    for (let year=1; year<=years; year++) {
      const revenue = Number(s.annualRevenueUgx || 0) * Math.pow(1+rg,year-1);
      const cost = Number(s.annualOperatingCostUgx || 0) * Math.pow(1+cg,year-1);
      const residual = year===years ? Number(s.residualValueUgx || 0) : 0;
      const netCashflow = revenue + residual - cost;
      const discounted = netCashflow / Math.pow(1+dr,year);
      cumulative += netCashflow;
      npv += discounted;
      discountedInflow += (revenue + residual) / Math.pow(1+dr,year);
      discountedOutflow += cost / Math.pow(1+dr,year);
      if (paybackYear===null && cumulative>=0) paybackYear=year;
      yearly.push({year,revenueUgx:Math.round(revenue),operatingCostUgx:Math.round(cost),residualValueUgx:Math.round(residual),netCashflowUgx:Math.round(netCashflow),discountedNetCashflowUgx:Math.round(discounted),cumulativeCashflowUgx:Math.round(cumulative)});
    }
    const totalRevenue = yearly.reduce((a,r)=>a+r.revenueUgx+r.residualValueUgx,0);
    const totalCosts = initialWithContingency + yearly.reduce((a,r)=>a+r.operatingCostUgx,0);
    return {
      years, initialInvestmentUgx:Math.round(initial), contingencyUgx:Math.round(initial*contingency),
      initialInvestmentWithContingencyUgx:Math.round(initialWithContingency),
      totalRevenueIncludingResidualUgx:Math.round(totalRevenue), totalOperatingCostsUgx:Math.round(yearly.reduce((a,r)=>a+r.operatingCostUgx,0)),
      totalCostsIncludingInitialUgx:Math.round(totalCosts), cumulativeNetCashflowUgx:Math.round(cumulative),
      npvUgx:Math.round(npv), paybackYear, discountedBenefitCostRatio:discountedOutflow>0?Number((discountedInflow/discountedOutflow).toFixed(3)):null,
      yearly,
    };
  }

  async dashboard() {
    const rows: any[] = await this.scenarios.find().sort({ createdAt: -1 }).lean();
    const decisions: any[] = await this.decisions.find().sort({ decisionDate: -1 }).lean();
    const scenarios = rows.map(s=>({...s, analysis:this.calculate(s)}));
    return { scenarios, decisions, summary: {
      scenarioCount: scenarios.length,
      approvedScenarioCount: scenarios.filter(s=>s.status==='approved').length,
      positiveNpvCount: scenarios.filter(s=>s.analysis.npvUgx>0).length,
      negativeNpvCount: scenarios.filter(s=>s.analysis.npvUgx<0).length,
    }, note:'All metrics are model outputs based on user-entered assumptions, not predictions or guaranteed returns.' };
  }
  async listScenarios() {
    const rows: any[] = await this.scenarios.find().sort({ createdAt: -1 }).lean();
    return rows.map(s=>({...s,analysis:this.calculate(s)}));
  }
  async createScenario(dto: any, user: any) {
    if (!dto.scenarioCode?.trim() || !dto.name?.trim() || !dto.businessLine || !dto.startDate) throw new BadRequestException('Scenario code, name, business line and start date are required.');
    const numberFields=['horizonYears','initialInvestmentUgx','annualOperatingCostUgx','annualRevenueUgx','annualRevenueGrowthPct','annualCostGrowthPct','discountRatePct','contingencyPct'];
    const numeric: any={};
    for (const f of numberFields) {
      const n=Number(dto[f]);
      if (!Number.isFinite(n) || n<0) throw new BadRequestException(`${f} must be a valid non-negative number.`);
      numeric[f]=n;
    }
    if (!Number.isInteger(numeric.horizonYears) || numeric.horizonYears<1 || numeric.horizonYears>40) throw new BadRequestException('Horizon must be a whole number between 1 and 40 years.');
    for (const f of ['annualRevenueGrowthPct','annualCostGrowthPct','discountRatePct','contingencyPct']) if (numeric[f]>100) throw new BadRequestException(`${f} cannot exceed 100%.`);
    if (dto.residualValueUgx!==undefined && dto.residualValueUgx!=='' && (!Number.isFinite(Number(dto.residualValueUgx)) || Number(dto.residualValueUgx)<0)) throw new BadRequestException('Residual value must be non-negative.');
    if (await this.scenarios.findOne({scenarioCode:dto.scenarioCode.trim()}).lean()) throw new BadRequestException('Scenario code already exists.');
    const row: any=await this.scenarios.create({...dto,...numeric,scenarioCode:dto.scenarioCode.trim(),residualValueUgx:dto.residualValueUgx===''||dto.residualValueUgx==null?undefined:Number(dto.residualValueUgx),createdBy:user.email});
    await this.audit.record(user.email,'created','investment_scenario',String(row._id),`Created investment scenario ${row.scenarioCode}`,{businessLine:row.businessLine});
    return {...row.toObject(),analysis:this.calculate(row)};
  }
  async updateStatus(id: string, dto: any, user: any) {
    if (!['draft','reviewed','approved','rejected'].includes(dto.status)) throw new BadRequestException('Status must be draft, reviewed, approved or rejected.');
    const row: any=await this.scenarios.findByIdAndUpdate(id,{status:dto.status},{new:true,runValidators:true}).lean();
    if (!row) throw new NotFoundException('Investment scenario not found.');
    await this.audit.record(user.email,'updated','investment_scenario',String(row._id),`Changed scenario ${row.scenarioCode} status to ${row.status}`);
    return {...row,analysis:this.calculate(row)};
  }
  async createDecision(dto: any, user: any) {
    if (!dto.decisionCode?.trim() || !dto.scenarioId || !dto.decisionDate || !dto.decision || !dto.rationale?.trim()) throw new BadRequestException('Decision code, scenario, date, decision and rationale are required.');
    if (!await this.scenarios.findById(dto.scenarioId).lean()) throw new BadRequestException('Scenario not found.');
    if (await this.decisions.findOne({decisionCode:dto.decisionCode.trim()}).lean()) throw new BadRequestException('Decision code already exists.');
    const row: any=await this.decisions.create({...dto,decisionCode:dto.decisionCode.trim(),recordedBy:user.email});
    await this.audit.record(user.email,'created','investment_decision',String(row._id),`Recorded investment decision ${row.decisionCode}`,{scenarioId:row.scenarioId,decision:row.decision});
    return row;
  }
}
