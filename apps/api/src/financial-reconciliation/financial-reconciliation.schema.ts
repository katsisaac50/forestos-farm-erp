import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class FinancialReconciliation {
  @Prop({ required: true, trim: true }) accountName!: string;
  @Prop({ required: true, enum: ['Cash', 'Bank', 'Mobile money', 'Other'] }) accountType!: string;
  @Prop({ required: true, match: /^\\d{4}-(0[1-9]|1[0-2])$/ }) month!: string;
  @Prop({ required: true, min: 0 }) openingBalanceUgx!: number;
  @Prop({ required: true, min: 0 }) statementClosingBalanceUgx!: number;
  @Prop({ required: true, min: 0 }) statementIncomeUgx!: number;
  @Prop({ required: true, min: 0 }) statementExpenseUgx!: number;
  @Prop({ required: true, min: 0 }) ledgerIncomeUgx!: number;
  @Prop({ required: true, min: 0 }) ledgerExpenseUgx!: number;
  @Prop({ required: true }) expectedClosingBalanceUgx!: number;
  @Prop({ required: true }) closingDifferenceUgx!: number;
  @Prop({ required: true, enum: ['Matched', 'Difference found', 'Needs review'] }) status!: string;
  @Prop({ required: true }) preparedBy!: string;
  @Prop() notes?: string;
  @Prop({ default: false }) reviewed!: boolean;
  @Prop() reviewedBy?: string;
  @Prop() reviewedAt?: Date;
}
export const FinancialReconciliationSchema = SchemaFactory.createForClass(FinancialReconciliation);
FinancialReconciliationSchema.index({ accountName: 1, month: 1 }, { unique: true });
FinancialReconciliationSchema.index({ month: -1, createdAt: -1 });
