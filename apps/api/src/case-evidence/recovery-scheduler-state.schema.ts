import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';
export type RecoverySchedulerStateDocument=HydratedDocument<RecoverySchedulerState>;
@Schema({timestamps:true,collection:'recovery_scheduler_state'})
export class RecoverySchedulerState {
 @Prop({type:String,default:'recovery-escalation-evaluator'}) _id:string;
 @Prop({type:String}) ownerToken?:string;
 @Prop({type:Date,default:new Date(0)}) leaseUntil:Date;
 @Prop({type:Date}) lastRunAt?:Date;
 @Prop({type:String,enum:['success','failed','skipped']}) lastStatus?:string;
 @Prop({type:String}) lastError?:string;
 @Prop({type:Number,default:0}) runCount:number;
}
export const RecoverySchedulerStateSchema=SchemaFactory.createForClass(RecoverySchedulerState);
