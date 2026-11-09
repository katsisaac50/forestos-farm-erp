import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FieldVerificationDocument = HydratedDocument<FieldVerification>;
@Schema({ timestamps: true })
export class FieldVerification {
 @Prop({required:true,trim:true,maxlength:120}) runId:string;
 @Prop({required:true,trim:true,maxlength:120}) workerIdentifier:string;
 @Prop({required:true,trim:true,maxlength:120}) farmBlock:string;
 @Prop({required:true,trim:true,maxlength:80}) activityType:string;
 @Prop({required:true,min:-90,max:90}) latitude:number;
 @Prop({required:true,min:-180,max:180}) longitude:number;
 @Prop({required:true,min:0,max:100000}) accuracyMeters:number;
 @Prop({required:true,trim:true,maxlength:240}) evidenceReference:string;
 @Prop({trim:true,maxlength:1000}) workerNote?:string;
 @Prop({enum:['submitted','approved','rejected'],default:'submitted'}) reviewStatus:string;
 @Prop({trim:true,maxlength:120}) reviewedBy?:string;
 @Prop({trim:true,maxlength:1000}) reviewNote?:string;
 @Prop() reviewedAt?:Date;
 @Prop({required:true,trim:true,maxlength:120}) submittedBy:string;
}
export const FieldVerificationSchema=SchemaFactory.createForClass(FieldVerification);
FieldVerificationSchema.index({runId:1,createdAt:-1});
FieldVerificationSchema.index({workerIdentifier:1,createdAt:-1});
FieldVerificationSchema.index({reviewStatus:1,createdAt:-1});
