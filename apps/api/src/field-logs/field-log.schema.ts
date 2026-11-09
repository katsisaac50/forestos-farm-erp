import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({timestamps:true})
export class FieldLog {
  @Prop({required:true,trim:true,unique:true}) logId!:string;
  @Prop({required:true}) date!:Date;
  @Prop({required:true,enum:['Forestry','Beekeeping','General']}) workstream!:string;
  @Prop({required:true,trim:true}) siteOrBlock!:string;
  @Prop({required:true,trim:true}) observedBy!:string;
  @Prop({required:true,trim:true}) observation!:string;
  @Prop() actionTaken?:string;
  @Prop() followUpRequired?:string;
  @Prop() followUpDue?:Date;
  @Prop() photoReference?:string;
  @Prop() gpsLatitude?:number;
  @Prop() gpsLongitude?:number;
  @Prop({enum:['Low','Medium','High','Critical'],default:'Low'}) riskLevel!:string;
  @Prop({enum:['Open','In progress','Resolved'],default:'Open'}) status!:string;
}
export const FieldLogSchema = SchemaFactory.createForClass(FieldLog);
