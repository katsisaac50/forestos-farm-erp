import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class EvidenceRecoveryIncident {
 @Prop({required:true,unique:true,trim:true}) incidentCode!:string;
 @Prop({required:true,trim:true}) title!:string;
 @Prop({required:true,trim:true}) description!:string;
 @Prop({required:true,enum:['critical','high','medium','low'],default:'medium',index:true}) severity!:string;
 @Prop({required:true,enum:['open','assigned','in_progress','awaiting_recovery','awaiting_approval','closed'],default:'open',index:true}) status!:string;
 @Prop({trim:true,index:true}) caseId?:string;
 @Prop({trim:true,index:true}) evidenceId?:string;
 @Prop({required:true,trim:true}) createdBy!:string;
 @Prop({trim:true,index:true}) assignedTo?:string;
 @Prop() dueDate?:Date;
 @Prop({trim:true}) resolutionSummary?:string;
 @Prop({trim:true}) closeReason?:string;
 @Prop({trim:true}) closedBy?:string;
 @Prop() closedAt?:Date;
 @Prop({trim:true}) approvedBy?:string;
 @Prop() approvedAt?:Date;
 @Prop({required:true,default:1,min:1}) recordVersion!:number;
 @Prop({type:[{at:Date,actor:String,action:String,reason:String,fromStatus:String,toStatus:String,version:Number}],default:[]}) history!:any[];
}
export const EvidenceRecoveryIncidentSchema=SchemaFactory.createForClass(EvidenceRecoveryIncident);
EvidenceRecoveryIncidentSchema.index({status:1,severity:1,dueDate:1});
EvidenceRecoveryIncidentSchema.index({caseId:1,evidenceId:1});
