import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Hive {
  @Prop({ required: true, trim: true })
  hiveId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, trim: true })
  apiarySite!: string;

  @Prop()
  gpsOrLandmark?: string;

  @Prop()
  installedDate?: Date;

  @Prop({ default: 'Other' })
  hiveType?: string;

  @Prop({ enum: ['Occupied', 'Empty', 'Weak', 'Queenless', 'Absconded', 'Unknown'], default: 'Unknown' })
  colonyStatus!: string;

  @Prop({ enum: ['Yes', 'No', 'Not checked'], default: 'Not checked' })
  queenSeen?: string;

  @Prop()
  lastInspection?: Date;

  @Prop()
  nextInspectionDue?: Date;

  @Prop({ min: 0, default: 0 })
  honeyHarvestedKg!: number;

  @Prop()
  repairsNeeded?: string;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  createdBy!: string;
}
export const HiveSchema = SchemaFactory.createForClass(Hive);
HiveSchema.index({ organizationId: 1, hiveId: 1 }, { unique: true });
HiveSchema.index({ organizationId: 1, apiarySite: 1 });
