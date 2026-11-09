import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true})
export class Inspection {
 @Prop({required:true,unique:true,trim:true}) inspectionId!:string;
 @Prop({required:true,enum:['Forestry','Beekeeping','General']}) workstream!:string;
 @Prop({required:true,trim:true}) siteOrBlock!:string;
 @Prop({required:true,trim:true}) title!:string;
 @Prop({required:true}) dueDate!:Date;
 @Prop({required:true,trim:true,lowercase:true}) assignedTo!:string;
 @Prop({required:true,trim:true,lowercase:true}) createdBy!:string;
 @Prop({required:true,enum:['Scheduled','In progress','Completed','Overdue'],default:'Scheduled'}) status!:string;
 @Prop({enum:['Low','Medium','High','Critical'],default:'Medium'}) priority!:string;
 @Prop() checklist?:string;
 @Prop() findings?:string;
 @Prop() correctiveAction?:string;
 @Prop() completedAt?:Date;
 @Prop() photoReference?:string;
}
export const InspectionSchema=SchemaFactory.createForClass(Inspection);
InspectionSchema.index({assignedTo:1,dueDate:1,status:1});
