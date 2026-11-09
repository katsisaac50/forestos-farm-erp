import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type FarmAssetDocument = HydratedDocument<FarmAsset>;
export type MaintenanceRecordDocument = HydratedDocument<MaintenanceRecord>;
export type SparePartDocument = HydratedDocument<SparePart>;
export const ASSET_TYPES = ['hand_tool','power_tool','vehicle','water_system','apiary_equipment','safety_equipment','building','other'] as const;
export const ASSET_STATUSES = ['active','needs_repair','under_maintenance','retired','lost'] as const;
export const MAINTENANCE_TYPES = ['preventive','repair','inspection','calibration','cleaning','other'] as const;
export const MAINTENANCE_STATUSES = ['planned','in_progress','completed','cancelled'] as const;

@Schema({timestamps:true})
export class FarmAsset {
 @Prop({required:true,unique:true,trim:true}) assetCode:string;
 @Prop({required:true,trim:true}) name:string;
 @Prop({required:true,enum:ASSET_TYPES}) assetType:string;
 @Prop({default:''}) description:string;
 @Prop({default:''}) location:string;
 @Prop({default:''}) serialNumber:string;
 @Prop({default:''}) makeModel:string;
 @Prop({default:null}) purchaseDate?:string;
 @Prop({min:0,default:0}) purchaseCostUgx:number;
 @Prop({default:''}) supplier:string;
 @Prop({default:''}) assignedTo:string;
 @Prop({required:true,enum:ASSET_STATUSES,default:'active'}) status:string;
 @Prop({default:null}) lastServiceDate?:string;
 @Prop({default:null}) nextServiceDate?:string;
 @Prop({default:0,min:0}) serviceIntervalDays:number;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const FarmAssetSchema=SchemaFactory.createForClass(FarmAsset);

@Schema({timestamps:true})
export class MaintenanceRecord {
 @Prop({required:true,index:true}) assetId:string;
 @Prop({required:true,trim:true}) maintenanceCode:string;
 @Prop({required:true,enum:MAINTENANCE_TYPES}) maintenanceType:string;
 @Prop({required:true,trim:true}) title:string;
 @Prop({default:''}) description:string;
 @Prop({required:true}) plannedDate:string;
 @Prop({default:null}) completedDate?:string;
 @Prop({required:true,enum:MAINTENANCE_STATUSES,default:'planned'}) status:string;
 @Prop({default:''}) assignedTo:string;
 @Prop({default:0,min:0}) labourCostUgx:number;
 @Prop({default:0,min:0}) partsCostUgx:number;
 @Prop({default:0,min:0}) otherCostUgx:number;
 @Prop({default:''}) partsUsed:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const MaintenanceRecordSchema=SchemaFactory.createForClass(MaintenanceRecord);

@Schema({timestamps:true})
export class SparePart {
 @Prop({required:true,unique:true,trim:true}) partCode:string;
 @Prop({required:true,trim:true}) name:string;
 @Prop({default:''}) category:string;
 @Prop({default:'piece'}) unit:string;
 @Prop({required:true,min:0,default:0}) quantityOnHand:number;
 @Prop({required:true,min:0,default:0}) reorderLevel:number;
 @Prop({required:true,min:0,default:0}) unitCostUgx:number;
 @Prop({default:''}) storageLocation:string;
 @Prop({default:''}) supplier:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const SparePartSchema=SchemaFactory.createForClass(SparePart);
