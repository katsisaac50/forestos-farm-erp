import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true, versionKey: false })
export class FinancialInvestigationCaseEvent {
 @Prop({ required: true, index: true }) caseId!: string;
 @Prop({ required: true, trim: true }) caseCode!: string;
 @Prop({ required: true, enum: ['created','assigned','status_changed','note_added','evidence_added','resolution_proposed','second_reviewed','closed','reopened'] }) eventType!: string;
 @Prop({ required: true, trim: true }) actor!: string;
 @Prop({ required: true, trim: true }) reason!: string;
 @Prop() previousValue?: string;
 @Prop() newValue?: string;
 @Prop() evidenceReference?: string;
}
export const FinancialInvestigationCaseEventSchema = SchemaFactory.createForClass(FinancialInvestigationCaseEvent);
FinancialInvestigationCaseEventSchema.index({ caseId: 1, createdAt: 1 });
