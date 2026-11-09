import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class RegenerationPlan {
  @Prop({ required: true, trim: true }) planName!: string;
  @Prop({ required: true, trim: true }) blockId!: string;
  @Prop({ required: true, enum: ['replanting','coppice_regrowth','mixed_review','restoration','other'] }) method!: string;
  @Prop({ required: true }) plannedStartDate!: string;
  @Prop() targetCompletionDate?: string;
  @Prop({ enum: ['draft','approved_internally','in_progress','monitoring','completed','deferred','cancelled'], default: 'draft' }) status!: string;
  @Prop({ min: 0 }) targetSeedlings?: number;
  @Prop({ min: 0 }) nurseryStockAvailable?: number;
  @Prop({ min: 0 }) targetAreaAcres?: number;
  @Prop() spacingOrLayout?: string;
  @Prop() seedlingSource?: string;
  @Prop() speciesOrClone?: string;
  @Prop() methodRationale?: string;
  @Prop() sitePreparationPlan?: string;
  @Prop() fireProtectionPlan?: string;
  @Prop() grazingProtectionPlan?: string;
  @Prop() notes?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type RegenerationPlanDocument = HydratedDocument<RegenerationPlan>;
export const RegenerationPlanSchema = SchemaFactory.createForClass(RegenerationPlan);
RegenerationPlanSchema.index({ blockId: 1, plannedStartDate: 1 });

@Schema({ timestamps: true })
export class RegenerationCost {
  @Prop({ required: true }) planId!: string;
  @Prop({ required: true, trim: true }) category!: string;
  @Prop({ required: true, min: 0 }) amountUgx!: number;
  @Prop({ required: true }) date!: string;
  @Prop() description?: string;
  @Prop() supplierOrReference?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type RegenerationCostDocument = HydratedDocument<RegenerationCost>;
export const RegenerationCostSchema = SchemaFactory.createForClass(RegenerationCost);
RegenerationCostSchema.index({ planId: 1, date: -1 });

@Schema({ timestamps: true })
export class SurvivalCheck {
  @Prop({ required: true }) planId!: string;
  @Prop({ required: true }) checkDate!: string;
  @Prop({ required: true, min: 0 }) sampleSize!: number;
  @Prop({ required: true, min: 0 }) liveCount!: number;
  @Prop({ required: true, min: 0 }) deadOrMissingCount!: number;
  @Prop() sampleMethod?: string;
  @Prop() replacementAction?: string;
  @Prop() findings?: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type SurvivalCheckDocument = HydratedDocument<SurvivalCheck>;
export const SurvivalCheckSchema = SchemaFactory.createForClass(SurvivalCheck);
SurvivalCheckSchema.index({ planId: 1, checkDate: -1 });
