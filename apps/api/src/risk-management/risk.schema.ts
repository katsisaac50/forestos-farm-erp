import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FarmRiskDocument = HydratedDocument<FarmRisk>;
export type RiskActionDocument = HydratedDocument<RiskAction>;

export const RISK_CATEGORIES = [
  'fire', 'drought', 'pests_disease', 'tree_mortality', 'weather',
  'market_buyer', 'cashflow', 'workforce', 'apiary_colony',
  'operations', 'compliance', 'security', 'other',
] as const;
export const RISK_STATUSES = ['open', 'monitoring', 'mitigating', 'accepted', 'closed'] as const;
export const RISK_ACTION_STATUSES = ['open', 'in_progress', 'completed', 'blocked'] as const;

@Schema({ timestamps: true })
export class FarmRisk {
  @Prop({ required: true, unique: true, trim: true }) riskCode: string;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, enum: RISK_CATEGORIES }) category: string;
  @Prop({ required: true, enum: ['eucalyptus', 'beekeeping', 'infrastructure', 'finance', 'workforce', 'whole_farm', 'other'], default: 'whole_farm' }) businessLine: string;
  @Prop({ required: true, trim: true }) description: string;
  @Prop({ required: true, min: 1, max: 5 }) likelihood: number;
  @Prop({ required: true, min: 1, max: 5 }) impact: number;
  @Prop({ default: '' }) existingControls: string;
  @Prop({ default: '' }) mitigationPlan: string;
  @Prop({ default: '' }) ownerResponsible: string;
  @Prop({ default: null }) reviewDate?: string;
  @Prop({ default: null }) dueDate?: string;
  @Prop({ required: true, enum: RISK_STATUSES, default: 'open' }) status: string;
  @Prop({ min: 1, max: 5, default: null }) residualLikelihood?: number;
  @Prop({ min: 1, max: 5, default: null }) residualImpact?: number;
  @Prop({ default: '' }) evidenceReference: string;
  @Prop({ default: '' }) createdBy: string;
}
export const FarmRiskSchema = SchemaFactory.createForClass(FarmRisk);

@Schema({ timestamps: true })
export class RiskAction {
  @Prop({ required: true, index: true }) riskId: string;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ default: '' }) actionOwner: string;
  @Prop({ default: null }) dueDate?: string;
  @Prop({ required: true, enum: RISK_ACTION_STATUSES, default: 'open' }) status: string;
  @Prop({ default: '' }) note: string;
  @Prop({ default: null }) completedAt?: Date;
  @Prop({ default: '' }) createdBy: string;
}
export const RiskActionSchema = SchemaFactory.createForClass(RiskAction);
