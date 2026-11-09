import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FinancialActionDocument = HydratedDocument<FinancialAction>;
@Schema({ timestamps: true })
export class FinancialAction {
  @Prop({ required: true, unique: true, index: true }) actionId: string;
  @Prop({ required: true, index: true }) sourceType: string;
  @Prop({ required: true, index: true }) sourceReference: string;
  @Prop({ required: true, index: true }) month: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) description: string;
  @Prop({ required: true, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' }) priority: string;
  @Prop({ required: true, enum: ['Open', 'In progress', 'Awaiting verification', 'Completed'], default: 'Open', index: true }) status: string;
  @Prop() assignedTo?: string;
  @Prop() dueDate?: Date;
  @Prop() actionNote?: string;
  @Prop() verificationNote?: string;
  @Prop() completedBy?: string;
  @Prop() completedAt?: Date;
  @Prop({ type: [Object], default: [] }) history: Array<Record<string, unknown>>;
}
export const FinancialActionSchema = SchemaFactory.createForClass(FinancialAction);
FinancialActionSchema.index({ sourceType: 1, sourceReference: 1 }, { unique: true });
