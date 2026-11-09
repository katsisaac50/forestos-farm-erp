import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FinancialAuditEntryDocument = HydratedDocument<FinancialAuditEntry>;

@Schema({ timestamps: true })
export class FinancialAuditEntry {
 @Prop({ required: true, unique: true, index: true }) auditEntryId: string;
 @Prop({ required: true, index: true }) month: string;
 @Prop({ required: true, index: true }) entityType: string;
 @Prop({ required: true, index: true }) entityReference: string;
 @Prop({ required: true }) eventType: string;
 @Prop({ required: true }) summary: string;
 @Prop() sourceStatus?: string;
 @Prop() evidenceStatus?: string;
 @Prop() actionStatus?: string;
 @Prop() reviewer?: string;
 @Prop() occurredAt?: Date;
 @Prop({ type: Object }) details?: Record<string, unknown>;
}
export const FinancialAuditEntrySchema = SchemaFactory.createForClass(FinancialAuditEntry);
FinancialAuditEntrySchema.index({ month: 1, occurredAt: -1 });
FinancialAuditEntrySchema.index({ entityType: 1, entityReference: 1, occurredAt: -1 });
