import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class ApiaryAction {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) actionId!: string;
  @Prop({ required: true, trim: true }) hiveId!: string;
  @Prop({ trim: true }) sourceInspectionId?: string;
  @Prop({ required: true, trim: true, maxlength: 180 }) title!: string;
  @Prop({ trim: true, maxlength: 4000 }) description?: string;
  @Prop({ enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' }) priority!: string;
  @Prop({ enum: ['Open', 'In progress', 'Blocked', 'Completed', 'Cancelled'], default: 'Open' }) status!: string;
  @Prop({ trim: true }) assignedTo?: string;
  @Prop() dueDate?: Date;
  @Prop() completedAt?: Date;
  @Prop({ trim: true, maxlength: 2000 }) completionNotes?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ required: true }) updatedBy!: string;
}
export const ApiaryActionSchema = SchemaFactory.createForClass(ApiaryAction);
ApiaryActionSchema.index({ organizationId: 1, actionId: 1 }, { unique: true });
ApiaryActionSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
ApiaryActionSchema.index({ organizationId: 1, hiveId: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class ApiaryActionEvent {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) actionId!: string;
  @Prop({ required: true }) eventType!: string;
  @Prop({ required: true }) actorId!: string;
  @Prop({ type: Object }) changes?: Record<string, unknown>;
  @Prop({ trim: true, maxlength: 1000 }) note?: string;
}
export const ApiaryActionEventSchema = SchemaFactory.createForClass(ApiaryActionEvent);
ApiaryActionEventSchema.index({ organizationId: 1, actionId: 1, createdAt: -1 });
