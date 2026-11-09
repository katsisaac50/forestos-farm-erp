import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FinancialEvidenceDocument = HydratedDocument<FinancialEvidence>;
@Schema({ timestamps: true })
export class FinancialEvidence {
 @Prop({ required: true, unique: true, index: true }) evidenceId: string;
 @Prop({ required: true, index: true }) month: string;
 @Prop({ required: true, enum: ['Receipt','Invoice','Bank statement','Photo','Email','Approval','Reconciliation','Other'] }) evidenceType: string;
 @Prop({ required: true }) title: string;
 @Prop({ required: true }) description: string;
 @Prop({ required: true }) reference: string;
 @Prop() sourceActionId?: string;
 @Prop({ required: true, enum: ['Pending review','Accepted','Rejected','Needs more information'], default: 'Pending review', index: true }) reviewStatus: string;
 @Prop() reviewNote?: string;
 @Prop() reviewedBy?: string;
 @Prop() reviewedAt?: Date;
 @Prop({ type: [Object], default: [] }) history: Array<Record<string, unknown>>;
}
export const FinancialEvidenceSchema = SchemaFactory.createForClass(FinancialEvidence);
