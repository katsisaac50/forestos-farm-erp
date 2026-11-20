import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class GrowerContract {
  _id!: Types.ObjectId;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) contractCode!: string;
  @Prop({ required: true }) growerName!: string;
  @Prop() growerContact?: string;
  @Prop({ required: true, enum: ['timber', 'honey', 'other'] }) commodityType!: string;
  @Prop({ required: true }) unit!: string;          // 'm3', 'kg'
  @Prop({ required: true, min: 0 }) contractQuantity!: number;
  @Prop({ required: true, min: 0 }) unitPriceUgx!: number;
  @Prop({ required: true }) startDate!: Date;
  @Prop({ required: true }) endDate!: Date;
  @Prop({ enum: ['draft', 'active', 'completed', 'cancelled'], default: 'draft' }) status!: string;
  @Prop() advancePaidUgx?: number;
  @Prop() advancePaidAt?: Date;
  @Prop() notes?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const GrowerContractSchema = SchemaFactory.createForClass(GrowerContract);
GrowerContractSchema.index({ organizationId: 1, contractCode: 1 }, { unique: true });

@Schema({ timestamps: true })
export class HarvestLot {
  _id!: Types.ObjectId;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) lotCode!: string;
  @Prop({ required: true, enum: ['own_farm', 'grower'] }) sourceType!: string;
  @Prop({ required: true }) blockId!: string;         // plantation block OR grower contract code
  @Prop() growerContractId?: Types.ObjectId;
  @Prop({ required: true }) harvestDate!: Date;
  @Prop({ required: true, enum: ['timber', 'honey', 'other'] }) commodityType!: string;
  @Prop({ required: true }) unit!: string;
  @Prop({ required: true, min: 0 }) quantity!: number;          // current remaining quantity
  @Prop({ required: true, min: 0 }) originalQuantity!: number;  // as received
  @Prop({ required: true, min: 0 }) unitCostUgx!: number;       // weighted avg cost per unit
  @Prop() grade?: string;
  @Prop() qualityNotes?: string;
  @Prop({ enum: ['in_stock', 'partially_sold', 'sold_out', 'written_off'], default: 'in_stock' }) status!: string;
  @Prop() journalEntryId?: Types.ObjectId;   // the entry that put this into inventory
  @Prop({ required: true }) createdBy!: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const HarvestLotSchema = SchemaFactory.createForClass(HarvestLot);
HarvestLotSchema.index({ organizationId: 1, lotCode: 1 }, { unique: true });

@Schema({ timestamps: true })
export class LotSale {
  _id!: Types.ObjectId;
  @Prop({ required: true, index: true }) organizationId!: string;
  @Prop({ required: true, index: true }) lotId!: Types.ObjectId;
  @Prop({ required: true }) saleCode!: string;
  @Prop({ required: true }) saleDate!: Date;
  @Prop({ required: true, min: 0 }) quantitySold!: number;
  @Prop({ required: true, min: 0 }) unitPriceUgx!: number;
  @Prop({ required: true, min: 0 }) totalRevenueUgx!: number;
  @Prop({ required: true, min: 0 }) costBasisUgx!: number;      // quantity × unit cost at sale time
  @Prop({ required: true, min: 0 }) grossMarginUgx!: number;    // revenue − cost
  @Prop() buyerName?: string;
  @Prop() paymentStatus!: string;                                // 'paid', 'pending', 'partial'
  @Prop() journalEntryId?: Types.ObjectId;
  @Prop({ required: true }) createdBy!: string;
  @Prop() createdAt!: Date;
  @Prop() updatedAt!: Date;
}

export const LotSaleSchema = SchemaFactory.createForClass(LotSale);
LotSaleSchema.index({ organizationId: 1, saleCode: 1 }, { unique: true });
LotSaleSchema.index({ organizationId: 1, lotId: 1 });