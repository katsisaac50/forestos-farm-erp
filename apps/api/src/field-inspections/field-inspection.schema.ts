import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FieldInspectionDocument = HydratedDocument<FieldInspection>;

@Schema({ timestamps: true, collection: 'field_inspections' })
export class FieldInspection {
  @Prop({ required: true, trim: true, maxlength: 100, index: true })
  title!: string;

  @Prop({ required: true, enum: ['eucalyptus', 'beekeeping', 'infrastructure', 'general'], index: true })
  activityType!: 'eucalyptus' | 'beekeeping' | 'infrastructure' | 'general';

  @Prop({ required: true, enum: ['routine', 'follow_up', 'incident'], index: true })
  inspectionType!: 'routine' | 'follow_up' | 'incident';

  @Prop({ required: true, enum: ['open', 'submitted', 'verified', 'rejected'], default: 'open', index: true })
  status!: 'open' | 'submitted' | 'verified' | 'rejected';

  @Prop({ required: true, trim: true, maxlength: 120, index: true })
  assignedTo!: string;

  @Prop({ required: true, trim: true, maxlength: 100, index: true })
  locationLabel!: string;

  @Prop({ required: true, min: -90, max: 90 })
  latitude!: number;

  @Prop({ required: true, min: -180, max: 180 })
  longitude!: number;

  @Prop({ trim: true, maxlength: 40 })
  blockCode?: string;

  @Prop({ trim: true, maxlength: 1000 })
  checklistSummary?: string;

  @Prop({ trim: true, maxlength: 1000 })
  findings?: string;

  @Prop({ trim: true, maxlength: 1000 })
  correctiveAction?: string;

  @Prop({ trim: true, maxlength: 500 })
  evidenceReference?: string;

  @Prop({ trim: true, maxlength: 500 })
  reviewNote?: string;

  @Prop()
  submittedAt?: Date;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  reviewedBy?: string;

  @Prop({ required: true })
  createdBy!: string;
}

export const FieldInspectionSchema = SchemaFactory.createForClass(FieldInspection);
