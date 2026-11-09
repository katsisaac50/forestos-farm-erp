
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class AuditEvent {
  @Prop({ required: true, index: true })
  actorEmail!: string;

  // Optional during compatibility rollout; legacy events remain
  // unattributed until reconciled.
  @Prop({ index: true, trim: true })
  tenantId?: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  entityType!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: Record<string, unknown>;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);

AuditEventSchema.index({ createdAt: -1 });
AuditEventSchema.index({ tenantId: 1, createdAt: -1 });
