import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FarmMapFeatureDocument = HydratedDocument<FarmMapFeature>;
export type FarmMapFeatureType = 'block' | 'hive' | 'inspection_point' | 'access_point' | 'other';
@Schema({ timestamps: true, collection: 'farm_map_features' })
export class FarmMapFeature {
  @Prop({ required: true, enum: ['block','hive','inspection_point','access_point','other'], index: true }) featureType!: FarmMapFeatureType;
  @Prop({ required: true, enum: ['Point','Polygon'] }) geometryType!: 'Point' | 'Polygon';
  // GeoJSON coordinates: [longitude, latitude].
  @Prop({ type: Object, required: true }) geometry!: { type: 'Point' | 'Polygon'; coordinates: any };
  @Prop({ required: true, trim: true, maxlength: 100 }) label!: string;
  @Prop({ trim: true, maxlength: 40, index: true }) blockCode?: string;
  @Prop({ min: 0, max: 100000 }) areaAcres?: number;
  @Prop({ trim: true, maxlength: 500 }) notes?: string;
  @Prop({ required: true, enum: ['manual','gps','imported'] }) source!: 'manual' | 'gps' | 'imported';
  @Prop({ required: true }) createdBy!: string;
  @Prop({ default: 'active', enum: ['active','archived'], index: true }) status!: 'active' | 'archived';
}
export const FarmMapFeatureSchema = SchemaFactory.createForClass(FarmMapFeature);
