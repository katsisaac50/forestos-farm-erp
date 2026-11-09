import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class MonthlyCloseVersion {
  @Prop({ required: true, index: true }) closeId!: string;
  @Prop({ required: true, index: true }) month!: string;
  @Prop({ required: true, enum: ['draft_saved', 'closed', 'reopened', 'source_changed'] }) eventType!: string;
  @Prop({ required: true }) actor!: string;
  @Prop({ required: true }) versionNumber!: number;
  @Prop({ required: true, type: Object }) snapshot!: Record<string, unknown>;
  @Prop() reason?: string;
  @Prop() sourceFingerprint?: string;
}
export type MonthlyCloseVersionDocument = HydratedDocument<MonthlyCloseVersion>;
export const MonthlyCloseVersionSchema = SchemaFactory.createForClass(MonthlyCloseVersion);
MonthlyCloseVersionSchema.index({ closeId: 1, versionNumber: -1 });
MonthlyCloseVersionSchema.index({ month: 1, createdAt: -1 });