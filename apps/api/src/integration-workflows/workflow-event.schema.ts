import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';
export type WorkflowEventDocument=HydratedDocument<WorkflowEvent>;
const eventTypes=['procurement_receipt','maintenance_parts_issue','nursery_stock_receipt','nursery_dispatch','manual_adjustment'];
const statuses=['pending','processing','processed','failed','cancelled'];
@Schema({timestamps:true})
export class WorkflowEvent {
 @Prop({required:true,unique:true,trim:true}) eventCode:string;
 @Prop({required:true,enum:eventTypes}) eventType:string;
 @Prop({required:true,default:'manual'}) sourceModule:string;
 @Prop({default:''}) sourceRecordId:string;
 @Prop({default:''}) sourceReference:string;
 @Prop({required:true}) stockItemId:string;
 @Prop({required:true,min:0.001}) quantity:number;
 @Prop({required:true,enum:['receipt','issue','adjustment_increase','adjustment_decrease','write_off']}) movementType:string;
 @Prop({required:true,min:0,default:0}) unitCostUgx:number;
 @Prop({required:true}) movementDate:string;
 @Prop({required:true,default:''}) reason:string;
 @Prop({required:true,enum:statuses,default:'pending'}) status:string;
 @Prop({default:''}) resultNote:string;
 @Prop({default:''}) errorMessage:string;
 @Prop({default:''}) createdBy:string;
 @Prop({default:''}) processedBy:string;
 @Prop({ type: Date, default: null }) processedAt: Date | null;
}
export const WorkflowEventSchema=SchemaFactory.createForClass(WorkflowEvent);
