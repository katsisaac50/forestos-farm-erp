import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class StatementImport {
  @Prop({ required: true}) importId!: string;
  @Prop({ required: true }) accountName!: string;
  @Prop({ required: true }) accountType!: string;
  @Prop({ required: true, match: /^\\d{4}-(0[1-9]|1[0-2])$/ }) month!: string;
  @Prop({ required: true }) fileName!: string;
  @Prop({ required: true }) uploadedBy!: string;
  @Prop({ required: true, default: 'Imported' }) status!: string;
  @Prop({ required: true, default: 0 }) rowCount!: number;
}
export const StatementImportSchema = SchemaFactory.createForClass(StatementImport);
StatementImportSchema.index({ importId: 1 }, { unique: true });

@Schema({ timestamps: true })
export class StatementRow {
  @Prop({ required: true}) importId!: string;
  @Prop({ required: true }) rowNumber!: number;
  @Prop({ required: true }) date!: Date;
  @Prop({ required: true }) amountUgx!: number;
  @Prop({ required: true, enum: ['Income', 'Expense'] }) direction!: string;
  @Prop({ required: true }) description!: string;
  @Prop() reference?: string;
  @Prop({ required: true, default: 'Unmatched', enum: ['Unmatched', 'Suggested', 'Matched', 'Ignored'] }) matchStatus!: string;
  @Prop() matchedTransactionId?: string;
  @Prop() suggestedTransactionId?: string;
  @Prop() matchReason?: string;
}
export const StatementRowSchema = SchemaFactory.createForClass(StatementRow);
StatementRowSchema.index({ importId: 1, rowNumber: 1 }, { unique: true });
StatementRowSchema.index({ importId: 1, matchStatus: 1 });
