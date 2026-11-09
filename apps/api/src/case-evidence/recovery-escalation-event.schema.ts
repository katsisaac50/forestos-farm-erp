import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class RecoveryEscalationEvent {
 @Prop({required:true,index:true}) incidentId!:string;
 @Prop({required:true,trim:true}) incidentCode!:string;
 @Prop({required:true,enum:['due_soon','overdue','critical_overdue','unassigned','approval_waiting']}) alertType!:string;
 @Prop({required:true,trim:true}) recipient!:string;
 @Prop({required:true,trim:true}) channel!:string;
 @Prop({required:true,enum:['queued','suppressed','failed','sent','logged_only']}) deliveryStatus!:string;
 @Prop({required:true,trim:true}) message!:string;
 @Prop({required:true,trim:true}) dedupeKey!:string;
 @Prop({required:true}) evaluatedAt!:Date;
 @Prop() dueDate?:Date;
 @Prop() daysOverdue?:number;
 @Prop({type:Number,default:0}) attemptCount!:number;
 @Prop({type:Date,index:true}) nextAttemptAt?:Date;
 @Prop({type:String}) lastError?:string;
 @Prop({type:Date}) deliveredAt?:Date;
 @Prop({type:String}) providerName?:string;
 @Prop({type:Number,default:0}) manualReplayCount!:number;
 @Prop({type:String}) lastReplayReason?:string;
 @Prop({type:String}) lastReplayedBy?:string;
 @Prop({type:Date}) lastReplayedAt?:Date;
}
export const RecoveryEscalationEventSchema=SchemaFactory.createForClass(RecoveryEscalationEvent);
RecoveryEscalationEventSchema.index({dedupeKey:1},{unique:true});
RecoveryEscalationEventSchema.index({incidentId:1,createdAt:-1});
