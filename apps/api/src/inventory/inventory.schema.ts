import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true}) export class InventoryItem {
 @Prop({required:true,trim:true}) itemId!:string; @Prop({required:true,trim:true}) name!:string;
 @Prop({required:true,trim:true}) category!:string; @Prop({required:true,trim:true}) unit!:string;
 @Prop({required:true,min:0,default:0}) openingStock!:number; @Prop({required:true,min:0,default:0}) received!:number;
 @Prop({required:true,min:0,default:0}) used!:number; @Prop({required:true,min:0,default:0}) reorderLevel!:number;
 @Prop() supplier?:string; @Prop() storageLocation?:string; @Prop() notes?:string;
 @Prop({required:true,index:true}) organizationId!:string;
 @Prop({required:true}) createdBy!:string;
}
export const InventoryItemSchema=SchemaFactory.createForClass(InventoryItem);
InventoryItemSchema.index({organizationId:1,itemId:1},{unique:true,name:'uniq_inventory_item_per_org'});
