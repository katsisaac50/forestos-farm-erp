import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FieldNavigationDocument = HydratedDocument<FieldNavigationRecord>;

@Schema({ timestamps: true, collection: 'field_navigation_records' })
export class FieldNavigationRecord {
  @Prop({ required: true, trim: true, maxlength: 100, index: true })
  title!: string;

  @Prop({ required: true, enum: ['block', 'hive', 'inspection_point', 'access_point', 'other'], index: true })
  targetType!: 'block' | 'hive' | 'inspection_point' | 'access_point' | 'other';

  @Prop({ required: true, trim: true, maxlength: 120, index: true })
  targetLabel!: string;

  @Prop({ required: true, min: -90, max: 90 })
  latitude!: number;

  @Prop({ required: true, min: -180, max: 180 })
  longitude!: number;

  @Prop({ trim: true, maxlength: 40 })
  blockCode?: string;

  @Prop({ trim: true, maxlength: 500 })
  instructions?: string;

  @Prop({ required: true, enum: ['manual', 'gps', 'map_feature'] })
  source!: 'manual' | 'gps' | 'map_feature';

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ default: 'active', enum: ['active', 'archived'], index: true })
  status!: 'active' | 'archived';
}
export const FieldNavigationSchema = SchemaFactory.createForClass(FieldNavigationRecord);
