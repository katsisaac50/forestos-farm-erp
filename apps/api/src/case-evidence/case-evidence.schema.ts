import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class CaseEvidence {
 @Prop({required:true,index:true}) caseId!:string;
 @Prop({required:true,trim:true}) caseCode!:string;
 @Prop({required:true,unique:true,trim:true}) evidenceCode!:string;
 @Prop({required:true,trim:true}) originalFileName!:string;
 @Prop({required:true,trim:true}) storedFileName!:string;
 @Prop({required:true,trim:true}) mimeType!:string;
 @Prop({required:true,min:1}) sizeBytes!:number;
 @Prop({required:true,match:/^[a-f0-9]{64}$/i}) sha256!:string;
 @Prop({required:true,trim:true}) uploadedBy!:string;
 @Prop({required:true,enum:['active','superseded','quarantined'],default:'active'}) status!:string;
 @Prop({trim:true}) description?:string;
}
export const CaseEvidenceSchema=SchemaFactory.createForClass(CaseEvidence);
CaseEvidenceSchema.index({caseId:1,createdAt:-1});
CaseEvidenceSchema.index({sha256:1});
