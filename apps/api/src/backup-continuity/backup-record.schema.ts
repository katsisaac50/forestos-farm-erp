import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
import {HydratedDocument} from 'mongoose';
export type BackupRecordDocument=HydratedDocument<BackupRecord>;
@Schema({timestamps:true})
export class BackupRecord{
 @Prop({required:true}) backupDate:string;
 @Prop({required:true,enum:['database','uploads','full']}) backupType:string;
 @Prop({required:true}) location:string;
 @Prop({default:''}) fileName:string;
 @Prop({required:true,min:0,default:0}) sizeBytes:number;
 @Prop({default:''}) checksum:string;
 @Prop({required:true,enum:['recorded','verified','failed'],default:'recorded'}) status:string;
 @Prop({default:''}) verificationMethod:string;
 @Prop({ type: Date, default: null }) verifiedAt?: Date | null;
 @Prop({default:''}) verifiedBy:string;
 @Prop({default:''}) verificationNotes:string;
 @Prop({default:''}) retentionUntil:string;
 @Prop({default:''}) notes:string;
 @Prop({default:''}) createdBy:string;
}
export const BackupRecordSchema=SchemaFactory.createForClass(BackupRecord);
BackupRecordSchema.index({backupDate:-1,status:1});
