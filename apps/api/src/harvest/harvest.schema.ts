import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class HarvestPlan {
  @Prop({ required: true, trim: true }) planName!: string;
  @Prop({ required: true, trim: true }) blockId!: string;
  @Prop({ required: true }) proposedStartDate!: string;
  @Prop() proposedEndDate?: string;
  @Prop({ enum: ['draft','assessment','ready_for_review','approved','in_progress','completed','deferred','cancelled'], default: 'draft' }) status!: string;
  @Prop({ enum: ['not_assessed','not_ready','needs_review','ready_subject_to_approval'], default: 'not_assessed' }) readinessStatus!: string;
  @Prop() readinessNotes?: string;
  @Prop() assessmentDate?: string;
  @Prop() assessor?: string;
  @Prop() expectedVolume?: number;
  @Prop({ enum: ['m3','tonne','piece','cord','other'] }) volumeUnit?: string;
  @Prop() volumeSource?: string;
  @Prop() productSpecification?: string;
  @Prop() replantingPlan?: string;
  @Prop() notes?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type HarvestPlanDocument = HydratedDocument<HarvestPlan>;
export const HarvestPlanSchema = SchemaFactory.createForClass(HarvestPlan);
HarvestPlanSchema.index({ blockId: 1, proposedStartDate: 1 });

@Schema({ timestamps: true })
export class TimberQuote {
  @Prop({ required: true, trim: true }) buyerName!: string;
  @Prop() contactName?: string;
  @Prop() contactDetails?: string;
  @Prop({ required: true, trim: true }) productSpecification!: string;
  @Prop({ required: true, enum: ['m3','tonne','piece','cord','other'] }) unit!: string;
  @Prop({ required: true, min: 0 }) pricePerUnit!: number;
  @Prop({ required: true }) quoteDate!: string;
  @Prop() expiryDate?: string;
  @Prop() transportIncluded?: boolean;
  @Prop() paymentTerms?: string;
  @Prop() sourceNotes?: string;
  @Prop() createdBy!: string;
}
export type TimberQuoteDocument = HydratedDocument<TimberQuote>;
export const TimberQuoteSchema = SchemaFactory.createForClass(TimberQuote);
TimberQuoteSchema.index({ buyerName: 1, quoteDate: -1 });

@Schema({ timestamps: true })
export class HarvestCost {
  @Prop({ required: true, trim: true }) planId!: string;
  @Prop({ required: true, trim: true }) category!: string;
  @Prop({ required: true, min: 0 }) amountUgx!: number;
  @Prop({ required: true }) date!: string;
  @Prop() description?: string;
  @Prop() quoteOrReceiptReference?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type HarvestCostDocument = HydratedDocument<HarvestCost>;
export const HarvestCostSchema = SchemaFactory.createForClass(HarvestCost);
HarvestCostSchema.index({ planId: 1, date: -1 });
