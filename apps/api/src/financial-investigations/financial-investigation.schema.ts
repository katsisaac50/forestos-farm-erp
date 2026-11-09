import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class FinancialInvestigation {
  @Prop({ required: true, unique: true, index: true }) investigationId!: string;
  @Prop({ required: true, index: true }) month!: string;
  @Prop({ required: true, enum: ['Missing receipt', 'Possible duplicate', 'Unmatched statement row', 'Reconciliation difference', 'Other'] }) exceptionType!: string;
  @Prop({ required: true }) sourceReference!: string;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) description!: string;
  @Prop({ required: true, enum: ['Low', 'Medium', 'High'] }) priority!: string;
  @Prop({ required: true, enum: ['Open', 'Under investigation', 'Awaiting evidence', 'Resolved', 'Closed - reviewed'] }) status!: string;
  @Prop({ required: true }) assignedTo!: string;
  @Prop({ required: true }) dueDate!: Date;
  @Prop() evidenceReference?: string;
  @Prop() resolutionNote?: string;
  @Prop() resolvedBy?: string;
  @Prop() resolvedAt?: Date;
  @Prop() reviewedBy?: string;
  @Prop() reviewedAt?: Date;
  @Prop({ type: [Object], default: [] }) history!: Record<string, unknown>[];
}
export const FinancialInvestigationSchema = SchemaFactory.createForClass(FinancialInvestigation);
FinancialInvestigationSchema.index({ status: 1, dueDate: 1 });
FinancialInvestigationSchema.index({ month: 1, createdAt: -1 });
