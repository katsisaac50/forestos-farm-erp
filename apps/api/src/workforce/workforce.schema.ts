import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class FarmWorker {
  @Prop({ required: true, trim: true }) workerCode!: string;
  @Prop({ required: true, trim: true }) displayName!: string;
  @Prop() contactDetails?: string;
  @Prop({ required: true, enum: ['field_worker','supervisor','contractor','seasonal','other'] }) workerType!: string;
  @Prop({ enum: ['active','inactive','seasonal','on_leave'], default: 'active' }) status!: string;
  @Prop({ min: 0 }) defaultDailyRateUgx?: number;
  @Prop() skillsOrNotes?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type FarmWorkerDocument = HydratedDocument<FarmWorker>;
export const FarmWorkerSchema = SchemaFactory.createForClass(FarmWorker);
FarmWorkerSchema.index({ workerCode: 1 }, { unique: true });

@Schema({ timestamps: true })
export class LabourTask {
  @Prop({ required: true, trim: true }) taskCode!: string;
  @Prop({ required: true, trim: true }) title!: string;
  @Prop({ required: true }) activity!: string;
  @Prop() plantationBlockId?: string;
  @Prop() assignedWorkerCode?: string;
  @Prop({ required: true }) plannedDate!: string;
  @Prop({ enum: ['low','normal','high','urgent'], default: 'normal' }) priority!: string;
  @Prop({ enum: ['assigned','in_progress','submitted','verified','rejected','cancelled'], default: 'assigned' }) status!: string;
  @Prop({ min: 0 }) targetQuantity?: number;
  @Prop() unit?: string;
  @Prop() instructions?: string;
  @Prop() completionNotes?: string;
  @Prop() verifiedBy?: string;
  @Prop() verifiedAt?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type LabourTaskDocument = HydratedDocument<LabourTask>;
export const LabourTaskSchema = SchemaFactory.createForClass(LabourTask);
LabourTaskSchema.index({ taskCode: 1 }, { unique: true });
LabourTaskSchema.index({ plannedDate: 1, status: 1 });

@Schema({ timestamps: true })
export class LabourEntry {
  @Prop({ required: true }) taskId!: string;
  @Prop({ required: true }) workerCode!: string;
  @Prop({ required: true }) workDate!: string;
  @Prop({ required: true, min: 0 }) hoursWorked!: number;
  @Prop({ required: true, min: 0 }) outputQuantity!: number;
  @Prop() outputUnit?: string;
  @Prop({ required: true, min: 0 }) labourCostUgx!: number;
  @Prop() notes?: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type LabourEntryDocument = HydratedDocument<LabourEntry>;
export const LabourEntrySchema = SchemaFactory.createForClass(LabourEntry);
LabourEntrySchema.index({ taskId: 1, workDate: 1 });
