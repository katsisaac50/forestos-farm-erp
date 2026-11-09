import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true,versionKey:false})
export class OrganizationAudit {
 @Prop({required:true,index:true}) organizationId!:string;
 @Prop({required:true,trim:true}) actor!:string;
 @Prop({required:true,enum:['organization_created','membership_added']}) action!:string;
 @Prop({required:true,trim:true,maxlength:1000}) reason!:string;
 @Prop({type:Object}) details?:Record<string,unknown>;
}
export const OrganizationAuditSchema=SchemaFactory.createForClass(OrganizationAudit);
OrganizationAuditSchema.index({organizationId:1,createdAt:-1});
