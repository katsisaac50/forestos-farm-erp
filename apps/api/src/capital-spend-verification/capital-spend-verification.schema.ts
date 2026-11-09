import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({timestamps:true})
export class CapitalSpendRecord {
 @Prop({required:true,unique:true,trim:true}) spendCode!:string;
 @Prop({required:true}) proposalId!:string;
 @Prop({required:true}) proposalCode!:string;
 @Prop({required:true,enum:['eucalyptus','beekeeping','infrastructure','other']}) businessLine!:string;
 @Prop({required:true,min:0}) amountUgx!:number;
 @Prop({required:true}) spendDate!:string;
 @Prop({required:true,trim:true}) supplierOrRecipient!:string;
 @Prop({required:true,trim:true}) evidenceReference!:string;
 @Prop({required:true,enum:['submitted','verified','rejected'],default:'submitted'}) status!:string;
 @Prop({required:true}) recordedBy!:string;
 @Prop() reviewedBy?:string;
 @Prop() reviewNote?:string;
 @Prop() reviewedAt?:Date;
 @Prop({enum:['none','correction_requested','reversed'],default:'none'}) correctionState?:string;
 @Prop() correctionOfSpendId?:string;
 @Prop() correctionReason?:string;
 @Prop() reversedBySpendId?:string;
}
export type CapitalSpendRecordDocument=HydratedDocument<CapitalSpendRecord>;
export const CapitalSpendRecordSchema=SchemaFactory.createForClass(CapitalSpendRecord);
CapitalSpendRecordSchema.index({proposalId:1,status:1});
CapitalSpendRecordSchema.index({businessLine:1,spendDate:1});
