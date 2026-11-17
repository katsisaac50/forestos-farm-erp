import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ChartOfAccount {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true }) code!: string;         // '1000', '4000', etc.
  @Prop({ required: true }) name!: string;         // 'Cash on Hand', 'Timber Sales'
  @Prop({
    required: true,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'],
  })
  type!: string;
  @Prop({
    required: true,
    enum: ['debit', 'credit'],
    // normal balance: which side increases this account
  })
  normalSide!: string;
  @Prop({ default: true }) active!: boolean;
  @Prop({ default: false }) isSystem!: boolean;    // system accounts can't be deleted
  @Prop() description?: string;
}

export const ChartOfAccountSchema = SchemaFactory.createForClass(ChartOfAccount);
ChartOfAccountSchema.index({ organizationId: 1, code: 1 }, { unique: true });

@Schema({ timestamps: true })
export class AccountingPeriod {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true }) periodStart!: Date;
  @Prop({ required: true }) periodEnd!: Date;
  @Prop({ required: true, enum: ['open', 'closing', 'closed'], default: 'open' }) status!: string;
  @Prop({ default: false }) locked!: boolean;      // hard lock — no postings
  @Prop() lockedAt?: Date;
  @Prop() lockedBy?: string;
  @Prop() closedAt?: Date;
  @Prop() closedBy?: string;
  @Prop() reopenReason?: string;
}

export const AccountingPeriodSchema = SchemaFactory.createForClass(AccountingPeriod);
AccountingPeriodSchema.index(
  { organizationId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) journalNumber!: string;  // 'JE-2026-00001'
  @Prop({ required: true }) date!: Date;
  @Prop({ required: true }) description!: string;
  // Idempotency: the source event that created this entry.
  // unique on (org, sourceType, sourceId) prevents duplicates.
  @Prop({ required: true }) sourceType!: string;   // 'FinanceTransaction'
  @Prop({ required: true, index: true }) sourceId!: string;      // FinanceTransaction._id
  @Prop({ required: true }) createdBy!: string;
  @Prop({ default: false }) posted!: boolean;      // false = draft, true = posted
  @Prop() postedAt?: Date;
  @Prop() postedBy?: string;
  @Prop() reversalOf?: string;                     // if this reverses another entry
  @Prop() reversedBy?: string;                     // if another entry reversed this one
  @Prop({ default: false }) voided!: boolean;
  @Prop() voidedAt?: Date;
  @Prop() voidReason?: string;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({ organizationId: 1, journalNumber: 1 }, { unique: true });
// The critical idempotency constraint — enforced at DB level
JournalEntrySchema.index(
  { organizationId: 1, sourceType: 1, sourceId: 1 },
  { unique: true },
);
JournalEntrySchema.index({ organizationId: 1, date: -1 });

@Schema({ timestamps: true })
export class JournalLine {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, type: Types.ObjectId, index: true }) journalEntryId!: Types.ObjectId;
  @Prop({ required: true, type: Types.ObjectId }) accountId!: Types.ObjectId;
  @Prop({ required: true }) accountCode!: string;  // denormalized for reports
  @Prop({ required: true, min: 0 }) debit!: number;
  @Prop({ required: true, min: 0 }) credit!: number;
  @Prop() memo?: string;
  @Prop() businessLine?: string;
  @Prop() counterparty?: string;
}

export const JournalLineSchema = SchemaFactory.createForClass(JournalLine);
JournalLineSchema.index({ organizationId: 1, journalEntryId: 1 });
JournalLineSchema.index({ organizationId: 1, accountId: 1 });