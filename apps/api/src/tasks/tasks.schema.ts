import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true}) export class FieldTask {
 @Prop({required:true,unique:true,trim:true}) taskId!:string; @Prop({required:true,trim:true}) title!:string;
 @Prop({required:true,enum:['Forestry','Beekeeping','Finance','Sales','Admin','Compliance']}) workstream!:string;
 @Prop({required:true,trim:true}) responsiblePerson!:string; @Prop({required:true}) dueDate!:Date;
 @Prop({enum:['High','Medium','Low'],default:'Medium'}) priority!:string;
 @Prop({enum:['Not started','In progress','Blocked','Completed','Cancelled'],default:'Not started'}) status!:string;
 @Prop() completedDate?:Date; @Prop({min:0,default:0}) budgetUgx!:number; @Prop({min:0,default:0}) actualCostUgx!:number;
 @Prop() evidenceReference?:string; @Prop() notes?:string;
}
export const FieldTaskSchema=SchemaFactory.createForClass(FieldTask);
