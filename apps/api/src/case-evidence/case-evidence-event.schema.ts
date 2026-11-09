import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class CaseEvidenceEvent {
 @Prop({required:true,index:true}) evidenceId!:string;
 @Prop({required:true,trim:true}) evidenceCode!:string;
 @Prop({required:true,enum:['uploaded','reviewed','quarantined','integrity_check','missing_file','recovery']}) eventType!:string;
 @Prop({required:true,trim:true}) actor!:string;
 @Prop({required:true,trim:true}) reason!:string;
 @Prop({trim:true}) sha256?:string;
}
export const CaseEvidenceEventSchema=SchemaFactory.createForClass(CaseEvidenceEvent);
CaseEvidenceEventSchema.index({evidenceId:1,createdAt:1});
