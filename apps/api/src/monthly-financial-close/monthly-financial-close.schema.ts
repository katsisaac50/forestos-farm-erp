import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class MonthlyFinancialClose {
  @Prop({ required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ })
  month!: string;

  @Prop({ required: true, enum: ['draft', 'ready_for_review', 'closed', 'reopened'], default: 'draft' })
  status!: string;

  @Prop({ required: true, min: 0 }) cashCountUgx!: number;
  @Prop({ required: true, min: 0 }) bankStatementBalanceUgx!: number;
  @Prop({ required: true, min: 0 }) mobileMoneyBalanceUgx!: number;
  @Prop({ required: true, min: 0 }) otherAccountBalanceUgx!: number;

  @Prop({ required: true, type: Object, default: {} })
  checklist!: Record<string, boolean>;

  @Prop({ required: true, trim: true }) preparerNote!: string;
  @Prop() varianceExplanation?: string;
  @Prop() reviewerNote?: string;
  @Prop() preparedBy!: string;
  @Prop() reviewedBy?: string;
  @Prop() reviewedAt?: Date;
  @Prop() closedAt?: Date;
  @Prop() reopenedAt?: Date;
  @Prop() reopenReason?: string;

  @Prop({ type: Object, default: {} })
  sourceSummary!: Record<string, unknown>;

  @Prop({ required: true, default: 1, min: 1 }) closeVersion!: number;
  @Prop() sourceFingerprint?: string;
  @Prop({ required: true, default: false }) sourceChangedAfterClose!: boolean;
  @Prop() sourceChangedDetectedAt?: Date;
}
export type MonthlyFinancialCloseDocument = HydratedDocument<MonthlyFinancialClose>;
export const MonthlyFinancialCloseSchema = SchemaFactory.createForClass(MonthlyFinancialClose);
MonthlyFinancialCloseSchema.index({ month: -1, status: 1 });