import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class FinanceTransaction {
  @Prop({ required: true, trim: true }) transactionId!: string;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ required: true }) date!: Date;
  @Prop({ required: true, enum: ['Income', 'Expense', 'Transfer'] }) direction!: string;
  @Prop({ required: true, enum: ['Forestry', 'Beekeeping', 'Shared/Admin'] }) businessLine!: string;
  @Prop({ required: true, trim: true }) category!: string;
  @Prop({ required: true, trim: true }) description!: string;
  @Prop({ required: true, min: 0 }) amountUgx!: number;
  @Prop({ enum: ['Cash', 'Mobile money', 'Bank', 'Other'], default: 'Cash' }) paymentMethod!: string;
  @Prop() counterparty?: string;
  @Prop() receiptReference?: string;
  @Prop({ default: false }) reconciled!: boolean;
  @Prop() notes?: string;
}

export const FinanceTransactionSchema = SchemaFactory.createForClass(FinanceTransaction);
// Unique transactionId per organization (not globally)
FinanceTransactionSchema.index({ organizationId: 1, transactionId: 1 }, { unique: true });
// Fast queries by org + date (finance pages sort by date, scoped to org)
FinanceTransactionSchema.index({ organizationId: 1, date: -1 });