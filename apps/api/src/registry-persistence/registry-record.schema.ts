import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, strict: true })
export class RegistryRecord {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true, trim: true }) domain!: string;
  @Prop({ required: true, trim: true }) recordId!: string;
  @Prop({ required: true }) recordedAt!: string;
  @Prop({ type: Object, required: true }) payload!: Record<string, unknown>;
  @Prop({ required: true }) payloadHash!: string;
  @Prop({ required: true, min: 1, default: 1 }) version!: number;
  @Prop({ required: true }) createdAt!: string;
  @Prop({ required: true }) updatedAt!: string;
  @Prop({ required: true }) lastBatchId!: string;
}
export type RegistryRecordDocument = HydratedDocument<RegistryRecord>;
export const RegistryRecordSchema = SchemaFactory.createForClass(RegistryRecord);
RegistryRecordSchema.index({ tenantId: 1, domain: 1, recordId: 1 }, { unique: true, name: 'tenant_domain_record_unique' });
RegistryRecordSchema.index({ tenantId: 1, updatedAt: -1 }, { name: 'tenant_updated_at' });
