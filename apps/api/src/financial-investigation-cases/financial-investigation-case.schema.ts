import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FinancialInvestigationCaseDocument = HydratedDocument<FinancialInvestigationCase>;
@Schema({ timestamps: true, versionKey: false })
export class FinancialInvestigationCase {
 @Prop({ required: true, unique: true, trim: true }) caseCode!: string;
 @Prop({ required: true, trim: true }) title!: string;
 @Prop({ required: true, enum: ['critical','high','review','medium','low'], default: 'review' }) severity!: string;
 @Prop({ required: true, enum: ['open','under_investigation','awaiting_evidence','resolved','closed'], default: 'open', index: true }) status!: string;
 @Prop({ required: true, trim: true }) description!: string;
 @Prop({ required: true, trim: true }) sourceType!: string;
 @Prop({ required: true, trim: true }) sourceReference!: string;
 @Prop({ required: true, trim: true }) createdBy!: string;
 @Prop({ trim: true }) assignedTo?: string;
 @Prop({ trim: true }) evidenceReference?: string;
 @Prop({ trim: true }) resolutionSummary?: string;
 @Prop({ trim: true }) closeReason?: string;
 @Prop({ required: true, default: 1, min: 1 }) recordVersion!: number;
 @Prop({ required: true, default: false }) secondReviewRequired!: boolean;
 @Prop({ trim: true }) secondReviewedBy?: string;
 @Prop() secondReviewedAt?: Date;
 @Prop({ trim: true }) lastUpdatedBy?: string;
}
export const FinancialInvestigationCaseSchema = SchemaFactory.createForClass(FinancialInvestigationCase);
FinancialInvestigationCaseSchema.index({ status: 1, severity: 1, updatedAt: -1 });
FinancialInvestigationCaseSchema.index({ sourceType: 1, sourceReference: 1 });
