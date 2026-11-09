import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type CorrectiveActionDocument = HydratedDocument<CorrectiveAction>;
@Schema({ timestamps: true, collection: 'corrective_actions' })
export class CorrectiveAction {
 @Prop({required:true,trim:true,maxlength:120,index:true}) title!:string;
 @Prop({required:true,trim:true,maxlength:1000}) description!:string;
 @Prop({required:true,enum:['low','medium','high','critical'],default:'medium',index:true}) priority!:'low'|'medium'|'high'|'critical';
 @Prop({required:true,enum:['open','in_progress','submitted','closed'],default:'open',index:true}) status!:'open'|'in_progress'|'submitted'|'closed';
 @Prop({required:true,trim:true,maxlength:120,index:true}) assignedTo!:string;
 @Prop({trim:true,maxlength:100}) farmBlock?:string;
 @Prop({trim:true,maxlength:120}) locationLabel?:string;
 @Prop({trim:true,maxlength:80,index:true}) sourceInspectionId?:string;
 @Prop({trim:true,maxlength:1000}) completionNote?:string;
 @Prop({trim:true,maxlength:500}) reviewNote?:string;
 @Prop({required:true}) dueAt!:Date;
 @Prop() submittedAt?:Date;
 @Prop() closedAt?:Date;
 @Prop() closedBy?:string;
 @Prop({required:true}) createdBy!:string;
}
export const CorrectiveActionSchema=SchemaFactory.createForClass(CorrectiveAction);
