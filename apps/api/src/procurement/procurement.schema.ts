import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type SupplierDocument=HydratedDocument<Supplier>;
export type PurchaseRequestDocument=HydratedDocument<PurchaseRequest>;
export type PurchaseOrderDocument=HydratedDocument<PurchaseOrder>;
export type PurchaseOrderLineDocument = HydratedDocument<PurchaseOrderLine>;
export type GoodsReceiptDocument=HydratedDocument<GoodsReceipt>;
export type GoodsReceiptLineDocument = HydratedDocument<GoodsReceiptLine>;
export const SUPPLIER_STATUSES=['active','on_hold','inactive'] as const;
export const REQUEST_STATUSES=['draft','submitted','approved','rejected','converted','cancelled'] as const;
export const ORDER_STATUSES=['draft','approved','part_received','received','cancelled'] as const;
export const RECEIPT_STATUSES=['received','partial','rejected'] as const;

@Schema({timestamps:true})
export class Supplier{
 @Prop({required:true,unique:true,trim:true}) supplierCode:string;
 @Prop({required:true,trim:true}) name:string;
 @Prop({default:''}) contactPerson:string;
 @Prop({default:''}) phone:string;
 @Prop({default:''}) email:string;
 @Prop({default:''}) address:string;
 @Prop({default:''}) taxOrRegistrationRef:string;
 @Prop({default:''}) categories:string;
 @Prop({default:''}) paymentTerms:string;
 @Prop({default:0,min:0,max:5}) performanceRating:number;
 @Prop({required:true,enum:SUPPLIER_STATUSES,default:'active'}) status:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const SupplierSchema=SchemaFactory.createForClass(Supplier);

@Schema({timestamps:true})
export class PurchaseRequest{
 @Prop({required:true,unique:true,trim:true}) requestCode:string;
 @Prop({required:true,trim:true}) title:string;
 @Prop({required:true}) requestedBy:string;
 @Prop({required:true}) neededBy:string;
 @Prop({default:''}) businessLine:string;
 @Prop({default:''}) justification:string;
 @Prop({required:true,min:0,default:0}) estimatedTotalUgx:number;
 @Prop({required:true,enum:REQUEST_STATUSES,default:'draft'}) status:string;
 @Prop({default:''}) decisionNote:string;
 @Prop({default:''}) createdBy:string;
}
export const PurchaseRequestSchema=SchemaFactory.createForClass(PurchaseRequest);

@Schema({timestamps:true})
export class PurchaseOrder{
 @Prop({required:true,unique:true,trim:true}) orderCode:string;
 @Prop({required:true,index:true}) supplierId:string;
 @Prop({default:null,index:true}) requestId?:string;
 @Prop({required:true}) orderDate:string;
 @Prop({required:true}) expectedDate:string;
 @Prop({required:true,enum:ORDER_STATUSES,default:'draft'}) status:string;
 @Prop({default:'UGX'}) currency:string;
 @Prop({default:0,min:0}) transportCostUgx:number;
 @Prop({default:0,min:0}) otherCostUgx:number;
 @Prop({default:''}) terms:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const PurchaseOrderSchema=SchemaFactory.createForClass(PurchaseOrder);

@Schema({timestamps:true})
export class PurchaseOrderLine{
 @Prop({required:true,index:true}) orderId:string;
 @Prop({required:true,trim:true}) itemName:string;
 @Prop({default:''}) itemCode:string;
 @Prop({required:true,min:0.001}) quantityOrdered:number;
 @Prop({default:0,min:0}) quantityReceived:number;
 @Prop({required:true,min:0}) unitPriceUgx:number;
 @Prop({default:'piece'}) unit:string;
 @Prop({default:''}) notes:string;
}
export const PurchaseOrderLineSchema=SchemaFactory.createForClass(PurchaseOrderLine);

@Schema({timestamps:true})
export class GoodsReceipt{
 @Prop({required:true,index:true}) orderId:string;
 @Prop({required:true,trim:true}) receiptCode:string;
 @Prop({required:true}) receivedDate:string;
 @Prop({required:true,enum:RECEIPT_STATUSES,default:'received'}) status:string;
 @Prop({default:''}) receivedBy:string;
 @Prop({default:''}) deliveryNoteReference:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const GoodsReceiptSchema=SchemaFactory.createForClass(GoodsReceipt);

@Schema({timestamps:true})
export class GoodsReceiptLine{
 @Prop({required:true,index:true}) receiptId:string;
 @Prop({required:true,index:true}) orderLineId:string;
 @Prop({required:true,min:0.001}) quantityReceived:number;
 @Prop({default:''}) condition:string;
 @Prop({default:''}) notes:string;
}
export const GoodsReceiptLineSchema=SchemaFactory.createForClass(GoodsReceiptLine);
