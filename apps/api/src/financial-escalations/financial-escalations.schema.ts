import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FinancialEscalationDocument = HydratedDocument<FinancialEscalation>;
@Schema({ timestamps: true })
export class FinancialEscalation {
 @Prop({ required: true, unique: true, index: true }) escalationId: string;
 @Prop({ required: true, index: true }) month: string;
 @Prop({ required: true, index: true }) sourceType: string;
 @Prop({ required: true, index: true }) sourceReference: string;
 @Prop({ required: true }) title: string;
 @Prop({ required: true }) reason: string;
 @Prop({ required: true, enum: ['Critical','High','Medium'], default: 'Medium', index: true }) priority: string;
 @Prop({ required: true, enum: ['Open','Acknowledged','Action required','Resolved'], default: 'Open', index: true }) status: string;
 @Prop() assignedTo?: string;
 @Prop() dueDate?: Date;
 @Prop() resolutionNote?: string;
 @Prop() resolvedAt?: Date;
 @Prop({ type: [Object], default: [] }) history: Array<Record<string, unknown>>;
}
export const FinancialEscalationSchema = SchemaFactory.createForClass(FinancialEscalation);
FinancialEscalationSchema.index({ sourceType: 1, sourceReference: 1 }, { unique: true });
