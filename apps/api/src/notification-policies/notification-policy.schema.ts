import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';

@Schema({timestamps:true,versionKey:false})
export class NotificationPolicy {
 @Prop({required:true,unique:true,trim:true,lowercase:true}) policyKey!:string;
 @Prop({required:true,trim:true,maxlength:120}) name!:string;
 @Prop({required:true,trim:true,maxlength:500}) description!:string;
 @Prop({required:true,enum:['critical','high','medium','low']}) severity!:string;
 @Prop({type:Boolean,default:true}) enabled!:boolean;
 @Prop({type:Number,default:1,min:1,max:30}) dueSoonDays!:number;
 @Prop({type:Number,default:24,min:1,max:720}) overdueRepeatHours!:number;
 @Prop({type:Number,default:24,min:1,max:720}) approvalWaitingHours!:number;
 @Prop({type:[String],default:[]}) recipients!:string[];
 @Prop({type:[String],enum:['webhook','internal_log'],default:['internal_log']}) channels!:string[];
 @Prop({type:Number,default:1,min:1,max:100000}) recordVersion!:number;
 @Prop({required:true,trim:true}) updatedBy!:string;
}
export type NotificationPolicyDocument=HydratedDocument<NotificationPolicy>;
export const NotificationPolicySchema=SchemaFactory.createForClass(NotificationPolicy);
NotificationPolicySchema.index({severity:1,enabled:1});
