import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({timestamps:true})
export class SalesOrder {
 @Prop({required:true,trim:true}) orderId!:string;
 @Prop({required:true}) orderDate!:Date;
 @Prop({required:true,trim:true}) customerName!:string;
 @Prop() phone?:string;
 @Prop({required:true,trim:true}) product!:string;
 @Prop({required:true,min:0}) quantity!:number;
 @Prop({required:true,trim:true}) unit!:string;
 @Prop({required:true,min:0}) unitPriceUgx!:number;
 @Prop({required:true,min:0}) amountPaidUgx!:number;
 @Prop({enum:['Enquiry','Confirmed','Part-paid','Paid','Delivered','Cancelled'],default:'Enquiry'}) status!:string;
 @Prop() dueDate?:Date;
 @Prop() notes?:string;
 @Prop({required:true,index:true}) organizationId!:string;
 @Prop({required:true}) createdBy!:string;
}
export const SalesOrderSchema=SchemaFactory.createForClass(SalesOrder);
SalesOrderSchema.index({organizationId:1,orderId:1},{unique:true,name:'uniq_sales_order_per_org'});
