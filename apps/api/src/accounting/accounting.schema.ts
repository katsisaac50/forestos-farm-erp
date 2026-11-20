import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ChartOfAccount {
  _id!: Types.ObjectId;                              // ← no @Prop
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true }) code!: string;
  @Prop({ required: true }) name!: string;
  @Prop({
    required: true,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'],
  })
  type!: string;
  @Prop({
    required: true,
    enum: ['debit', 'credit'],
  })
  normalSide!: string;
  @Prop({ default: true }) active!: boolean;
  @Prop({ default: false }) isSystem!: boolean;
  @Prop() description?: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const ChartOfAccountSchema = SchemaFactory.createForClass(ChartOfAccount);
ChartOfAccountSchema.index({ organizationId: 1, code: 1 }, { unique: true });

@Schema({ timestamps: true })
export class AccountingPeriod {
  _id!: Types.ObjectId;                              // ← no @Prop
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true }) periodStart!: Date;
  @Prop({ required: true }) periodEnd!: Date;
  @Prop({ required: true, enum: ['open', 'closing', 'closed'], default: 'open' }) status!: string;
  @Prop({ default: false }) locked!: boolean;
  @Prop() lockedAt?: Date;
  @Prop() lockedBy?: string;
  @Prop() closedAt?: Date;
  @Prop() closedBy?: string;
  @Prop() reopenReason?: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const AccountingPeriodSchema = SchemaFactory.createForClass(AccountingPeriod);
AccountingPeriodSchema.index(
  { organizationId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

@Schema({ timestamps: true })
export class JournalEntry {
  _id!: Types.ObjectId;                              // ← no @Prop
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) journalNumber!: string;
  @Prop({ required: true }) date!: Date;
  @Prop({ required: true }) description!: string;
  @Prop({ required: true }) sourceType!: string;
  @Prop({ required: true, index: true }) sourceId!: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ default: false }) posted!: boolean;
  @Prop() postedAt?: Date;
  @Prop() postedBy?: string;
  @Prop() reversalOf?: string;
  @Prop() reversedBy?: string;
  @Prop({ default: false }) voided!: boolean;
  @Prop() voidedAt?: Date;
  @Prop() voidReason?: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({ organizationId: 1, journalNumber: 1 }, { unique: true });
JournalEntrySchema.index(
  { organizationId: 1, sourceType: 1, sourceId: 1 },
  { unique: true },
);
JournalEntrySchema.index({ organizationId: 1, date: -1 });

@Schema({ timestamps: true })
export class JournalLine {
  _id!: Types.ObjectId;                              // ← no @Prop
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, type: Types.ObjectId, index: true }) journalEntryId!: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId }) accountId!: Types.ObjectId;
  @Prop({ required: true }) accountCode!: string;
  @Prop({ required: true, min: 0 }) debit!: number;
  @Prop({ required: true, min: 0 }) credit!: number;
  @Prop() memo?: string;
  @Prop() businessLine?: string;
  @Prop() counterparty?: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const JournalLineSchema = SchemaFactory.createForClass(JournalLine);
JournalLineSchema.index({ organizationId: 1, journalEntryId: 1 });
JournalLineSchema.index({ organizationId: 1, accountId: 1 });