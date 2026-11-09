import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type PhotoEvidenceDocument = HydratedDocument<PhotoEvidence>;
@Schema({timestamps:true})
export class PhotoEvidence {
 @Prop({required:true,trim:true,maxlength:120,index:true}) runId:string;
 @Prop({required:true,trim:true,maxlength:120,index:true}) farmBlock:string;
 @Prop({required:true,trim:true,maxlength:120,index:true}) uploadedBy:string;
 @Prop({required:true,trim:true,maxlength:180}) originalName:string;
 @Prop({required:true,trim:true,maxlength:80}) storedName:string;
 @Prop({required:true,enum:['image/jpeg','image/png','image/webp']}) mimeType:string;
 @Prop({required:true,min:1,max:4000000}) sizeBytes:number;
 @Prop({required:true,trim:true,maxlength:80,index:true}) sha256:string;
 @Prop({trim:true,maxlength:1000}) caption?:string;
 @Prop({enum:['pending_review','approved','rejected'],default:'pending_review',index:true}) reviewStatus:string;
 @Prop({trim:true,maxlength:120}) reviewedBy?:string;
 @Prop({trim:true,maxlength:1000}) reviewNote?:string;
 @Prop() reviewedAt?:Date;
}
export const PhotoEvidenceSchema=SchemaFactory.createForClass(PhotoEvidence);
PhotoEvidenceSchema.index({runId:1,createdAt:-1});
PhotoEvidenceSchema.index({uploadedBy:1,createdAt:-1});
