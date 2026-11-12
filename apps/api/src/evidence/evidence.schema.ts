import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EvidenceDocument = HydratedDocument<Evidence>;

@Schema({ timestamps: true })
export class Evidence {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  inspectionId!: string;

  @Prop({ required: true, trim: true })
  siteOrBlock!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  uploadedBy!: string;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  dataBase64!: string;

  @Prop()
  caption?: string;

  @Prop({ required: true, default: Date.now })
  capturedAt!: Date;
}

export const EvidenceSchema = SchemaFactory.createForClass(Evidence);

EvidenceSchema.index({ organizationId: 1, inspectionId: 1, capturedAt: -1 });
EvidenceSchema.index({ organizationId: 1, uploadedBy: 1, capturedAt: -1 });

// import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
// @Schema({timestamps:true})
// export class Evidence {
//  @Prop({required:true,index:true}) inspectionId!:string;
//  @Prop({required:true,trim:true}) siteOrBlock!:string;
//  @Prop({required:true,trim:true,lowercase:true}) uploadedBy!:string;
//  @Prop({required:true}) fileName!:string;
//  @Prop({required:true}) mimeType!:string;
//  @Prop({required:true}) dataBase64!:string;
//  @Prop() caption?:string;
//  @Prop({required:true,default:Date.now}) capturedAt!:Date;
// }
// export const EvidenceSchema=SchemaFactory.createForClass(Evidence);
// EvidenceSchema.index({inspectionId:1,capturedAt:-1});
