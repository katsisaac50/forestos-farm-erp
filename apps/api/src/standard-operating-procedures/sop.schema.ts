import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type SopTemplateDocument = HydratedDocument<SopTemplate>;
export type SopRunDocument = HydratedDocument<SopRun>;
@Schema({timestamps:true})
export class SopTemplate {
 @Prop({required:true,unique:true,trim:true}) sopCode!:string;
 @Prop({required:true,trim:true}) title!:string;
 @Prop({required:true,enum:['Eucalyptus','Beekeeping','General']}) workstream!:string;
 @Prop({required:true,enum:['daily','weekly','monthly','event_based']}) cadence!:string;
 @Prop({required:true,trim:true}) purpose!:string;
 @Prop({required:true,default:[]}) checklist!:Array<{code:string;label:string;required:boolean;guidance:string}>;
 @Prop({required:true,default:'active',enum:['draft','active','retired']}) status!:string;
 @Prop({default:''}) ownerRole!:string;
 @Prop({default:''}) safetyNotes!:string;
 @Prop({required:true,default:''}) createdBy!:string;
}
export const SopTemplateSchema=SchemaFactory.createForClass(SopTemplate);
SopTemplateSchema.index({workstream:1,status:1,cadence:1});
@Schema({timestamps:true})
export class SopRun {
 @Prop({required:true,index:true}) templateId!:string;
 @Prop({required:true}) sopCode!:string;
 @Prop({required:true}) title!:string;
 @Prop({required:true,enum:['Eucalyptus','Beekeeping','General']}) workstream!:string;
 @Prop({required:true}) siteOrBlock!:string;
 @Prop({required:true}) scheduledDate!:string;
 @Prop({required:true}) assignedTo!:string;
 @Prop({required:true,default:'open',enum:['open','in_progress','submitted','verified','rejected','cancelled']}) status!:string;
 @Prop({required:true,default:[]}) checklistResults!:Array<{code:string;label:string;result:'done'|'not_done'|'not_applicable';note:string;evidenceReference:string}>;
 @Prop({default:''}) completionSummary!:string;
 @Prop({default:''}) exceptionNotes!:string;
 @Prop({default:''}) evidenceReference!:string;
 @Prop({default:''}) submittedBy!:string;
 @Prop({default:null}) submittedAt?:Date;
 @Prop({default:''}) verifiedBy!:string;
 @Prop({default:null}) verifiedAt?:Date;
 @Prop({default:''}) verificationNote!:string;
 @Prop({required:true,default:''}) createdBy!:string;
}
export const SopRunSchema=SchemaFactory.createForClass(SopRun);
SopRunSchema.index({scheduledDate:1,status:1,workstream:1});
SopRunSchema.index({templateId:1,scheduledDate:1,siteOrBlock:1});
