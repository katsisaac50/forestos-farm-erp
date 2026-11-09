import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class SpendEvidenceEvent {
  @Prop({ required: true, index: true }) spendRecordId!: string;
  @Prop({ required: true, enum: ['evidence_reference_added', 'correction_requested', 'reversal_recorded'] }) eventType!: string;
  @Prop({ required: true, trim: true }) actor!: string;
  @Prop({ required: true, trim: true }) reason!: string;
  @Prop() previousValue?: string;
  @Prop() newValue?: string;
  @Prop() relatedSpendRecordId?: string;
  @Prop({ required: true, default: false }) isFinancialReversal!: boolean;
}
export type SpendEvidenceEventDocument = HydratedDocument<SpendEvidenceEvent>;
export const SpendEvidenceEventSchema = SchemaFactory.createForClass(SpendEvidenceEvent);
SpendEvidenceEventSchema.index({ spendRecordId: 1, createdAt: -1 });