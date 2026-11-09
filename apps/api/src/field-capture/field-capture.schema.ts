import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class FieldCapture {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) captureId!: string;
  @Prop({ required: true, trim: true }) clientSubmissionId!: string;
  @Prop({ required: true, trim: true }) taskId!: string;
  @Prop({ required: true, trim: true }) workerId!: string;
  @Prop({ required: true, enum: ['Inspection', 'Task completion', 'Incident', 'Harvest', 'Other'] }) captureType!: string;
  @Prop({ required: true, trim: true, maxlength: 180 }) title!: string;
  @Prop({ trim: true, maxlength: 5000 }) notes?: string;
  @Prop({ type: [Object], default: [] }) evidenceManifest!: Array<Record<string, unknown>>;
  @Prop({ type: Object }) location?: Record<string, unknown>;
  @Prop({ default: false }) locationConsent!: boolean;
  @Prop({ enum: ['Submitted', 'Reviewed', 'Needs changes'], default: 'Submitted' }) reviewStatus!: string;
  @Prop({ trim: true, maxlength: 1500 }) reviewNotes?: string;
  @Prop() reviewedAt?: Date;
  @Prop({ required: true }) createdBy!: string;
  @Prop() reviewedBy?: string;
}
export const FieldCaptureSchema = SchemaFactory.createForClass(FieldCapture);
FieldCaptureSchema.index({ organizationId: 1, clientSubmissionId: 1 }, { unique: true });
FieldCaptureSchema.index({ organizationId: 1, taskId: 1, createdAt: -1 });
FieldCaptureSchema.index({ organizationId: 1, reviewStatus: 1, createdAt: -1 });
