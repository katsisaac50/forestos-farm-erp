import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class CostBudgetPlan {
  @Prop({ required: true, trim: true }) budgetCode!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true }) periodStart!: string;
  @Prop({ required: true }) periodEnd!: string;
  @Prop() plantationBlockId?: string;
  @Prop({ required: true }) activity!: string;
  @Prop({ required: true, min: 0 }) budgetUgx!: number;
  @Prop({ min: 0 }) plannedOutputQuantity?: number;
  @Prop() plannedOutputUnit?: string;
  @Prop() assumptions?: string;
  @Prop({ enum: ['draft','active','closed'], default: 'active' }) status!: string;
  @Prop({ required: true }) createdBy!: string;
}
export type CostBudgetPlanDocument = HydratedDocument<CostBudgetPlan>;
export const CostBudgetPlanSchema = SchemaFactory.createForClass(CostBudgetPlan);
CostBudgetPlanSchema.index({ budgetCode: 1 }, { unique: true });
CostBudgetPlanSchema.index({ periodStart: 1, periodEnd: 1, activity: 1 });

@Schema({ timestamps: true })
export class CostAllocation {
  @Prop() planId?: string;
  @Prop() plantationBlockId?: string;
  @Prop({ required: true }) activity!: string;
  @Prop({ required: true, enum: ['labour','seedlings','site_preparation','maintenance','harvest','transport','equipment','apiary','administration','other'] }) category!: string;
  @Prop({ required: true, min: 0 }) amountUgx!: number;
  @Prop({ required: true }) date!: string;
  @Prop({ required: true, enum: ['manual','finance','workforce','nursery','regeneration','harvest'] , default: 'manual' }) sourceModule!: string;
  @Prop() sourceReference?: string;
  @Prop() note?: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type CostAllocationDocument = HydratedDocument<CostAllocation>;
export const CostAllocationSchema = SchemaFactory.createForClass(CostAllocation);
CostAllocationSchema.index({ planId: 1, date: 1 });
CostAllocationSchema.index({ sourceModule: 1, sourceReference: 1 });
