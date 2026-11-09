import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class NurseryBatch {
  @Prop({ required: true, trim: true}) batchCode!: string;
  @Prop({ required: true, trim: true }) speciesOrClone!: string;
  @Prop({ required: true }) startDate!: string;
  @Prop({ required: true, min: 0 }) initialQuantity!: number;
  @Prop({ required: true, min: 0, default: 0 }) currentQuantity!: number;
  @Prop({ required: true, enum: ['seed','cutting','seedling','other'] }) propagationType!: string;
  @Prop({ enum: ['planned','germinating','growing','ready','partially_dispatched','dispatched','lost','closed'], default: 'planned' }) status!: string;
  @Prop() supplierOrSource?: string;
  @Prop() unitCostUgx?: number;
  @Prop() expectedReadyDate?: string;
  @Prop() notes?: string;
  @Prop({ required: true }) createdBy!: string;
}
export type NurseryBatchDocument = HydratedDocument<NurseryBatch>;
export const NurseryBatchSchema = SchemaFactory.createForClass(NurseryBatch);
NurseryBatchSchema.index({ batchCode: 1 }, { unique: true });
NurseryBatchSchema.index({ status: 1, expectedReadyDate: 1 });

@Schema({ timestamps: true })
export class NurseryMovement {
  @Prop({ required: true }) batchId!: string;
  @Prop({ required: true, enum: ['production_added','loss','dispatch','adjustment_in','adjustment_out'] }) movementType!: string;
  @Prop({ required: true, min: 1 }) quantity!: number;
  @Prop({ required: true }) movementDate!: string;
  @Prop() reason?: string;
  @Prop() regenerationPlanId?: string;
  @Prop() plantationBlockId?: string;
  @Prop() reference?: string;
  @Prop({ required: true }) recordedBy!: string;
}
export type NurseryMovementDocument = HydratedDocument<NurseryMovement>;
export const NurseryMovementSchema = SchemaFactory.createForClass(NurseryMovement);
NurseryMovementSchema.index({ batchId: 1, movementDate: -1 });
