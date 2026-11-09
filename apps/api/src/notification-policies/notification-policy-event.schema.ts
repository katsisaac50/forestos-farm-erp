import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class NotificationPolicyEvent {
 @Prop({required:true,index:true}) policyKey!:string;
 @Prop({required:true,trim:true}) actor!:string;
 @Prop({required:true,enum:['created','updated','enabled','disabled']}) action!:string;
 @Prop({required:true,trim:true,maxlength:1000}) reason!:string;
 @Prop({type:Object}) before?:Record<string,unknown>;
 @Prop({type:Object}) after?:Record<string,unknown>;
 @Prop({type:Number}) previousVersion?:number;
 @Prop({type:Number}) newVersion?:number;
}
export const NotificationPolicyEventSchema=SchemaFactory.createForClass(NotificationPolicyEvent);
NotificationPolicyEventSchema.index({policyKey:1,createdAt:-1});
