import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * One record per block. Tracks the block's current fair value and cost basis.
 * Updated when valuations are posted or when harvest moves inventory out.
 */
@Schema({ timestamps: true })
export class BiologicalAsset {
  _id!: Types.ObjectId;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) blockId!: string;
  @Prop({ required: true }) plantedDate!: Date;
  @Prop({ required: true, min: 0 }) areaAcres!: number;
  @Prop({ required: true }) species!: string;
  @Prop({ required: true, min: 0 }) costBasisUgx!: number;     // accumulated cost capitalised
  @Prop({ required: true, min: 0 }) fairValueUgx!: number;     // current fair value
  @Prop({ required: true, min: 0 }) estimatedVolume!: number;  // m3 or other unit
  @Prop({ required: true }) volumeUnit!: string;               // 'm3'
  @Prop({ required: true, min: 0 }) fairValuePerUnitUgx!: number;
  @Prop() lastValuationDate?: Date;
  @Prop() lastValuationBy?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const BiologicalAssetSchema = SchemaFactory.createForClass(BiologicalAsset);
BiologicalAssetSchema.index({ organizationId: 1, blockId: 1 }, { unique: true });

/**
 * A valuation event — the moment fair value changed and the GL was posted.
 * Immutable. Cannot be edited or deleted.
 */
@Schema({ timestamps: true })
export class BiologicalValuation {
  _id!: Types.ObjectId;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) blockId!: string;
  @Prop({ required: true }) valuationDate!: Date;
  @Prop({ required: true, min: 0 }) previousFairValueUgx!: number;
  @Prop({ required: true, min: 0 }) newFairValueUgx!: number;
  @Prop({ required: true }) gainLossUgx!: number;              // newFairValue - previousFairValue (can be negative)
  @Prop({ required: true, min: 0 }) estimatedVolume!: number;
  @Prop({ required: true }) volumeUnit!: string;
  @Prop({ required: true, min: 0 }) fairValuePerUnitUgx!: number;
  @Prop() valuationMethod!: string;                             // 'market' | 'cost' | 'income'
  @Prop() notes?: string;
  @Prop() journalEntryId?: Types.ObjectId;                      // GL entry that recorded this
  @Prop({ required: true }) createdBy!: string;
  @Prop() createdAt!: Date;
}

export const BiologicalValuationSchema = SchemaFactory.createForClass(BiologicalValuation);
BiologicalValuationSchema.index({ organizationId: 1, blockId: 1, valuationDate: -1 });