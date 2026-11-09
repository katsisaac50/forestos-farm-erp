import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EvidenceAccessEventDocument = HydratedDocument<EvidenceAccessEvent>;

@Schema({ timestamps: true, collection: 'evidence_access_events' })
export class EvidenceAccessEvent {
  @Prop({ required: true, index: true }) organizationId: string;
  @Prop({ required: true, index: true }) captureId: string;
  @Prop({ required: true, index: true }) evidenceId: string;
  @Prop({ required: true, index: true }) actorId: string;
  @Prop({ required: true, enum: ['uploaded', 'downloaded', 'deleted'], index: true })
  eventType: 'uploaded' | 'downloaded' | 'deleted';
  @Prop({ required: true, enum: ['success', 'denied', 'failed'] })
  outcome: 'success' | 'denied' | 'failed';
  @Prop({ type: Object, default: {} }) details: Record<string, unknown>;
}
export const EvidenceAccessEventSchema = SchemaFactory.createForClass(EvidenceAccessEvent);
EvidenceAccessEventSchema.index({ organizationId: 1, createdAt: -1 });
EvidenceAccessEventSchema.index({ organizationId: 1, captureId: 1, createdAt: -1 });
