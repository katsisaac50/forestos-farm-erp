import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Plantation {
  @Prop({ required: true, trim: true })
  blockId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, trim: true })
  location!: string;

  @Prop({ required: true, min: 0 })
  areaAcres!: number;

  @Prop()
  cloneOrProvenance?: string;

  @Prop()
  plantingDate?: Date;

  @Prop({ min: 0 })
  initialTrees?: number;

  @Prop({ min: 0 })
  latestLiveTrees?: number;

  @Prop({ min: 0 })
  averageHeightM?: number;

  @Prop({ min: 0 })
  averageDbhCm?: number;

  @Prop()
  lastInspection?: Date;

  @Prop()
  nextAction?: string;

  @Prop()
  nextActionDue?: Date;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  createdBy!: string;
}

export const PlantationSchema = SchemaFactory.createForClass(Plantation);
PlantationSchema.index({ organizationId: 1, blockId: 1 }, { unique: true });
PlantationSchema.index({ organizationId: 1, location: 1 });
