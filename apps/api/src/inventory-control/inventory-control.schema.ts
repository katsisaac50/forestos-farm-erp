import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';
export type StockItemDocument=HydratedDocument<StockItem>;
export type StockMovementDocument=HydratedDocument<StockMovement>;
export const STOCK_CATEGORIES=['seedlings','spare_parts','fuel','tools','beekeeping','fertiliser','safety','packaging','other'] as const;
export const MOVEMENT_TYPES=['opening_balance','receipt','issue','return','adjustment_increase','adjustment_decrease','write_off'] as const;
@Schema({timestamps:true})
export class StockItem{
 @Prop({required:true,trim:true}) itemCode:string;
 @Prop({required:true,index:true}) organizationId:string;
 @Prop({required:true,trim:true}) name:string;
 @Prop({required:true,enum:STOCK_CATEGORIES}) category:string;
 @Prop({default:'piece'}) unit:string;
 @Prop({required:true,min:0,default:0}) quantityOnHand:number;
 @Prop({required:true,min:0,default:0}) reorderLevel:number;
 @Prop({required:true,min:0,default:0}) averageUnitCostUgx:number;
 @Prop({default:''}) storageLocation:string;
 @Prop({default:''}) supplier:string;
 @Prop({default:''}) linkedAssetCode:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const StockItemSchema=SchemaFactory.createForClass(StockItem);
// Tenant-scoped uniqueness. Before production rollout, audit duplicates and explicitly migrate/drop the legacy global itemCode index.
StockItemSchema.index({organizationId:1,itemCode:1},{unique:true,name:'uniq_stock_item_org_code'});
@Schema({timestamps:true})
export class StockMovement{
 @Prop({required:true,index:true}) itemId:string;
 @Prop({required:true,index:true}) organizationId:string;
 @Prop({required:true,trim:true}) movementCode:string;
 @Prop({required:true,enum:MOVEMENT_TYPES}) movementType:string;
 @Prop({required:true}) movementDate:string;
 @Prop({required:true,min:0.001}) quantity:number;
 @Prop({required:true,min:0}) unitCostUgx:number;
 @Prop({required:true,min:0}) balanceAfter:number;
 @Prop({default:''}) referenceType:string;
 @Prop({default:''}) referenceCode:string;
 @Prop({default:''}) destinationOrSource:string;
 @Prop({default:''}) reason:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const StockMovementSchema=SchemaFactory.createForClass(StockMovement);
// Movement codes are unique within an organization, not globally.
StockMovementSchema.index({organizationId:1,movementCode:1},{unique:true,name:'uniq_stock_movement_org_code'});
StockMovementSchema.index({organizationId:1,movementDate:-1,createdAt:-1},{name:'stock_movement_org_date'});
