import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class InvestmentScenario {
  @Prop({ required: true, trim: true }) scenarioCode!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true, enum: ['eucalyptus','beekeeping','infrastructure','working_capital','other'] }) businessLine!: string;
  @Prop({ required: true }) startDate!: string;
  @Prop({ required: true, min: 1, max: 40 }) horizonYears!: number;
  @Prop({ required: true, min: 0 }) initialInvestmentUgx!: number;
  @Prop({ required: true, min: 0 }) annualOperatingCostUgx!: number;
  @Prop({ required: true, min: 0 }) annualRevenueUgx!: number;
  @Prop({ required: true, min: 0, max: 100 }) annualRevenueGrowthPct!: number;
  @Prop({ required: true, min: 0, max: 100 }) annualCostGrowthPct!: number;
  @Prop({ required: true, min: 0, max: 100 }) discountRatePct!: number;
  @Prop({ required: true, min: 0, max: 100 }) contingencyPct!: number;
  @Prop() residualValueUgx?: number;
  @Prop() assumptions?: string;
  @Prop({ enum: ['draft','reviewed','approved','rejected'], default: 'draft' }) status!: string;
  @Prop({ required: true }) createdBy!: string;
}
export type InvestmentScenarioDocument = HydratedDocument<InvestmentScenario>;
export const InvestmentScenarioSchema = SchemaFactory.createForClass(InvestmentScenario);
InvestmentScenarioSchema.index({ scenarioCode: 1 }, { unique: true });
InvestmentScenarioSchema.index({ businessLine: 1, status: 1 });

@Schema({ timestamps: true })
export class InvestmentDecision {
  @Prop({ required: true, trim: true }) decisionCode!: string;
  @Prop({ required: true }) scenarioId!: string;
  @Prop({ required: true }) decisionDate!: string;
  @Prop({ required: true, enum: ['approved','rejected','deferred','needs_more_evidence'] }) decision!: string;
  @Prop({ required: true }) rationale!: string;
  @Prop() conditions?: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type InvestmentDecisionDocument = HydratedDocument<InvestmentDecision>;
export const InvestmentDecisionSchema = SchemaFactory.createForClass(InvestmentDecision);
InvestmentDecisionSchema.index({ decisionCode: 1 }, { unique: true });
