import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';
export type PerformanceTargetDocument=HydratedDocument<PerformanceTarget>;
@Schema({timestamps:true})
export class PerformanceTarget{
 @Prop({required:true,trim:true}) targetCode:string;
 @Prop({required:true,trim:true}) title:string;
 @Prop({required:true,enum:['Forestry','Beekeeping','Finance','Workforce','Operations','Whole farm']}) area:string;
 @Prop({required:true,enum:['count','percent','UGX','hours','kg','litres','trees','hives','colonies','days','other']}) unit:string;
 @Prop({required:true,min:0}) baseline:number;
 @Prop({required:true,min:0}) targetValue:number;
 @Prop({required:true}) periodStart:string;
 @Prop({required:true}) periodEnd:string;
 @Prop({required:true,enum:['higher','lower','exact']}) direction:string;
 @Prop({default:''}) sourceOrMethod:string;
 @Prop({default:''}) ownerResponsible:string;
 @Prop({required:true,enum:['draft','active','achieved','at_risk','missed','cancelled'],default:'draft'}) status:string;
 @Prop({default:''}) notes:string;
 @Prop({required:true,default:''}) createdBy:string;
}
export const PerformanceTargetSchema=SchemaFactory.createForClass(PerformanceTarget);
PerformanceTargetSchema.index({targetCode:1},{unique:true});
PerformanceTargetSchema.index({periodStart:1,periodEnd:1,status:1});
@Schema({timestamps:true})
export class PerformanceUpdate{
 @Prop({required:true,index:true}) targetId:string;
 @Prop({required:true}) updateDate:string;
 @Prop({required:true,min:0}) actualValue:number;
 @Prop({default:''}) evidenceReference:string;
 @Prop({default:''}) explanation:string;
 @Prop({required:true,default:''}) recordedBy:string;
}
export type PerformanceUpdateDocument=HydratedDocument<PerformanceUpdate>;
export const PerformanceUpdateSchema=SchemaFactory.createForClass(PerformanceUpdate);
PerformanceUpdateSchema.index({targetId:1,updateDate:-1});
