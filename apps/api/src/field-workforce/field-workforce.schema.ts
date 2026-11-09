import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class FieldWorker {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) workerId!: string;
  @Prop({ required: true, trim: true, maxlength: 120 }) displayName!: string;
  @Prop({ trim: true, lowercase: true }) email?: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ enum: ['Active', 'Inactive'], default: 'Active' }) status!: string;
  @Prop({ trim: true }) skills?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ required: true }) updatedBy!: string;
}
export const FieldWorkerSchema = SchemaFactory.createForClass(FieldWorker);
FieldWorkerSchema.index({ organizationId: 1, workerId: 1 }, { unique: true });
FieldWorkerSchema.index({ organizationId: 1, status: 1, displayName: 1 });

@Schema({ timestamps: true })
export class FieldTask {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) taskId!: string;
  @Prop({ required: true, trim: true, maxlength: 180 }) title!: string;
  @Prop({ trim: true, maxlength: 4000 }) description?: string;
  @Prop({ enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' }) priority!: string;
  @Prop({ enum: ['Assigned', 'Accepted', 'In progress', 'Blocked', 'Submitted', 'Approved', 'Rejected', 'Cancelled'], default: 'Assigned' }) status!: string;
  @Prop({ required: true, index: true }) workerId!: string;
  @Prop({ trim: true }) apiaryActionId?: string;
  @Prop() dueDate?: Date;
  @Prop() startedAt?: Date;
  @Prop() submittedAt?: Date;
  @Prop() reviewedAt?: Date;
  @Prop({ trim: true, maxlength: 2000 }) completionNotes?: string;
  @Prop({ type: [String], default: [] }) evidenceReferences!: string[];
  @Prop({ trim: true, maxlength: 1000 }) reviewNotes?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ required: true }) updatedBy!: string;
}
export const FieldTaskSchema = SchemaFactory.createForClass(FieldTask);
FieldTaskSchema.index({ organizationId: 1, taskId: 1 }, { unique: true });
FieldTaskSchema.index({ organizationId: 1, workerId: 1, status: 1, dueDate: 1 });
FieldTaskSchema.index({ organizationId: 1, apiaryActionId: 1 });

@Schema({ timestamps: true })
export class FieldTaskEvent {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) taskId!: string;
  @Prop({ required: true }) eventType!: string;
  @Prop({ required: true }) actorId!: string;
  @Prop({ type: Object }) details?: Record<string, unknown>;
  @Prop({ trim: true, maxlength: 1000 }) note?: string;
}
export const FieldTaskEventSchema = SchemaFactory.createForClass(FieldTaskEvent);
FieldTaskEventSchema.index({ organizationId: 1, taskId: 1, createdAt: -1 });
