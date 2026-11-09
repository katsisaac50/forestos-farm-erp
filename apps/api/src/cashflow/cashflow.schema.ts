import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class CashPosition {
  @Prop({ required: true }) asOfDate!: string;
  @Prop({ required: true, min: 0 }) openingCashUgx!: number;
  @Prop({ required: true }) note!: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type CashPositionDocument = HydratedDocument<CashPosition>;
export const CashPositionSchema = SchemaFactory.createForClass(CashPosition);
CashPositionSchema.index({ asOfDate: -1 });

@Schema({ timestamps: true })
export class CashflowPlan {
  @Prop({ required: true, trim: true }) planCode!: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ required: true }) periodStart!: string;
  @Prop({ required: true }) periodEnd!: string;
  @Prop({ required: true, enum: ['inflow','outflow','reserve','investment'] }) category!: string;
  @Prop({ required: true, min: 0 }) plannedAmountUgx!: number;
  @Prop({ required: true }) confidence!: string;
  @Prop() relatedBusinessLine?: string;
  @Prop() note?: string;
  @Prop({ enum: ['planned','committed','completed','cancelled'], default: 'planned' }) status!: string;
  @Prop({ required: true }) createdBy!: string;
}
export type CashflowPlanDocument = HydratedDocument<CashflowPlan>;
export const CashflowPlanSchema = SchemaFactory.createForClass(CashflowPlan);
CashflowPlanSchema.index({ planCode: 1 }, { unique: true });
CashflowPlanSchema.index({ periodStart: 1, periodEnd: 1, status: 1 });

@Schema({ timestamps: true })
export class CapitalDecision {
  @Prop({ required: true, trim: true }) decisionCode!: string;
  @Prop({ required: true }) decisionDate!: string;
  @Prop({ required: true }) purpose!: string;
  @Prop({ required: true, enum: ['eucalyptus','beekeeping','infrastructure','working_capital','reserve','other'] }) destination!: string;
  @Prop({ required: true, min: 0 }) proposedAmountUgx!: number;
  @Prop({ required: true, min: 0 }) protectedReserveUgx!: number;
  @Prop({ required: true, min: 0 }) cashAvailableUgx!: number;
  @Prop({ required: true, min: 0 }) otherCommittedUgx!: number;
  @Prop({ required: true }) rationale!: string;
  @Prop({ enum: ['draft','approved','rejected','executed'], default: 'draft' }) status!: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type CapitalDecisionDocument = HydratedDocument<CapitalDecision>;
export const CapitalDecisionSchema = SchemaFactory.createForClass(CapitalDecision);
CapitalDecisionSchema.index({ decisionCode: 1 }, { unique: true });
