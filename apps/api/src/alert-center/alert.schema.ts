import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type AlertStateDocument = HydratedDocument<AlertState>;
@Schema({timestamps:true})
export class AlertState {
  @Prop({required:true,unique:true,index:true}) alertKey!:string;
  @Prop({required:true}) alertType!:string;
  @Prop({required:true}) severity!:string;
  @Prop({required:true}) title!:string;
  @Prop({required:true}) detail!:string;
  @Prop({required:true}) sourcePath!:string;
  @Prop({required:true}) firstSeenAt!:Date;
  @Prop({required:true}) lastSeenAt!:Date;
  @Prop({required:true,default:'open',enum:['open','acknowledged','resolved']}) state!:string;
  @Prop({default:''}) acknowledgedBy!:string;
  @Prop({ type: Date, default: null }) acknowledgedAt!: Date | null;
  @Prop({default:''}) resolutionNote!:string;
  @Prop({ type: Date, default: null }) resolvedAt!: Date | null;
  @Prop({default:''}) lastActionBy!:string;
}
export const AlertStateSchema=SchemaFactory.createForClass(AlertState);
AlertStateSchema.index({state:1,severity:1,lastSeenAt:-1});
