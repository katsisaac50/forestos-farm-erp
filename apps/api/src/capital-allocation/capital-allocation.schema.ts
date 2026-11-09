import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
@Schema({timestamps:true})
export class CapitalAllocationPolicy {
 @Prop({required:true,unique:true,default:'default'}) policyKey!:string;
 @Prop({required:true,min:0}) minimumOperatingReserveUgx!:number;
 @Prop({required:true,min:0}) eucalyptusBudgetUgx!:number;
 @Prop({required:true,min:0}) beekeepingBudgetUgx!:number;
 @Prop({required:true,min:0}) infrastructureBudgetUgx!:number;
 @Prop({required:true,min:0}) otherBudgetUgx!:number;
 @Prop({required:true}) updatedBy!:string;
}
export type CapitalAllocationPolicyDocument=HydratedDocument<CapitalAllocationPolicy>;
export const CapitalAllocationPolicySchema=SchemaFactory.createForClass(CapitalAllocationPolicy);
@Schema({timestamps:true})
export class CapitalAllocationProposal {
 @Prop({required:true,unique:true,trim:true}) proposalCode!:string;
 @Prop({required:true,trim:true}) title!:string;
 @Prop({required:true,enum:['eucalyptus','beekeeping','infrastructure','other']}) businessLine!:string;
 @Prop({required:true,min:0}) amountUgx!:number;
 @Prop({required:true}) purpose!:string;
 @Prop({required:true}) evidenceReference!:string;
 @Prop({required:true,min:0,default:0}) verifiedSpendUgx!:number;
 @Prop({required:true,enum:['proposed','approved','rejected','deferred','executed'],default:'proposed'}) status!:string;
 @Prop({required:true}) createdBy!:string;
 @Prop() reviewedBy?:string;
 @Prop() reviewNote?:string;
 @Prop() reviewedAt?:Date;
}
export type CapitalAllocationProposalDocument=HydratedDocument<CapitalAllocationProposal>;
export const CapitalAllocationProposalSchema=SchemaFactory.createForClass(CapitalAllocationProposal);
CapitalAllocationProposalSchema.index({businessLine:1,status:1});
