import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class ApiaryInspection {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) hiveId!: string;
  @Prop({ required: true }) inspectionDate!: Date;
  @Prop({ enum: ['Strong', 'Moderate', 'Weak', 'Queenless', 'Unknown'], default: 'Unknown' }) colonyStrength!: string;
  @Prop({ enum: ['Seen', 'Not seen', 'Not checked'], default: 'Not checked' }) queenStatus!: string;
  @Prop({ min: 0 }) broodFrames?: number;
  @Prop({ min: 0 }) honeyFrames?: number;
  @Prop({ enum: ['None', 'Low', 'Moderate', 'High', 'Not checked'], default: 'Not checked' }) pestOrDiseaseLevel!: string;
  @Prop() findings?: string;
  @Prop() actionRequired?: string;
  @Prop({ required: true }) inspectedBy!: string;
  @Prop({ required: true }) createdBy!: string;
}
export const ApiaryInspectionSchema = SchemaFactory.createForClass(ApiaryInspection);
ApiaryInspectionSchema.index({ organizationId: 1, hiveId: 1, inspectionDate: -1 });

@Schema({ timestamps: true })
export class HoneyHarvest {
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, trim: true }) hiveId!: string;
  @Prop({ required: true }) harvestDate!: Date;
  @Prop({ required: true, min: 0 }) quantityKg!: number;
  @Prop({ enum: ['Raw', 'Filtered', 'Comb', 'Other'], default: 'Raw' }) productType!: string;
  @Prop({ min: 0 }) moisturePercent?: number;
  @Prop() batchCode?: string;
  @Prop() notes?: string;
  @Prop({ required: true }) harvestedBy!: string;
  @Prop({ required: true }) createdBy!: string;
}
export const HoneyHarvestSchema = SchemaFactory.createForClass(HoneyHarvest);
HoneyHarvestSchema.index({ organizationId: 1, hiveId: 1, harvestDate: -1 });
HoneyHarvestSchema.index({ organizationId: 1, batchCode: 1 });
