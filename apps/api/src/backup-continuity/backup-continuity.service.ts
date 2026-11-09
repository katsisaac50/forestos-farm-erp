import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {BackupRecord,BackupRecordDocument} from './backup-record.schema';
@Injectable()
export class BackupContinuityService{
 constructor(@InjectModel(BackupRecord.name)private records:Model<BackupRecordDocument>){}
 async dashboard(){
  const [records,total,verified,failed,latest]=await Promise.all([
   this.records.find().sort({createdAt:-1}).limit(300).lean(),this.records.countDocuments(),
   this.records.countDocuments({status:'verified'}),this.records.countDocuments({status:'failed'}),
   this.records.findOne().sort({createdAt:-1}).lean()
  ]);
  const latestVerified=await this.records.findOne({status:'verified'}).sort({verifiedAt:-1,createdAt:-1}).lean();
  return {totals:{records:total,verified,failed,latestStatus:latest?.status||'not_recorded'},latest,latestVerified,records};
 }
 async list(){return this.records.find().sort({createdAt:-1}).limit(300).lean();}
 async create(b:any,actor=''){
  if(!b?.backupDate||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.backupDate)||Number.isNaN(Date.parse(b.backupDate)))throw new BadRequestException('backupDate must be YYYY-MM-DD');
  if(!['database','uploads','full'].includes(b.backupType))throw new BadRequestException('backupType must be database, uploads, or full');
  if(!String(b.location||'').trim())throw new BadRequestException('Enter the protected backup location or storage label');
  const size=Number(b.sizeBytes||0);if(!Number.isFinite(size)||size<0)throw new BadRequestException('sizeBytes must be >= 0');
  return this.records.create({backupDate:b.backupDate,backupType:b.backupType,location:String(b.location).slice(0,300),fileName:String(b.fileName||'').slice(0,250),sizeBytes:size,checksum:String(b.checksum||'').slice(0,250),status:'recorded',verificationMethod:'',verifiedAt:null,retentionUntil:b.retentionUntil||'',notes:String(b.notes||'').slice(0,1000),createdBy:actor});
 }
 async verify(id:string,b:any,actor=''){
  const rec=await this.records.findById(id);if(!rec)throw new NotFoundException('Backup record not found');
  if(!['checksum','restore_test','manual_review'].includes(b?.verificationMethod))throw new BadRequestException('Select checksum, restore_test, or manual_review');
  if(typeof b?.passed!=='boolean')throw new BadRequestException('passed must be true or false');
  rec.verificationMethod=b.verificationMethod;rec.verifiedAt=new Date();rec.verifiedBy=actor;
  rec.status=b.passed?'verified':'failed';rec.verificationNotes=String(b.notes||'').slice(0,1000);return rec.save();
 }
 async drill(b:any,actor=''){
  if(!b?.drillDate||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(b.drillDate)||Number.isNaN(Date.parse(b.drillDate)))throw new BadRequestException('drillDate must be YYYY-MM-DD');
  if(!['pass','fail','not_run'].includes(b.result))throw new BadRequestException('result must be pass, fail, or not_run');
  if(!String(b.summary||'').trim())throw new BadRequestException('Enter the recovery drill summary');
  return this.records.create({backupDate:b.drillDate,backupType:'full',location:String(b.environment||'isolated test environment').slice(0,300),fileName:'RECOVERY-DRILL',sizeBytes:0,checksum:'',status:b.result==='pass'?'verified':b.result==='fail'?'failed':'recorded',verificationMethod:'restore_test',verifiedAt:b.result==='not_run'?null:new Date(),verifiedBy:actor,verificationNotes:String(b.summary).slice(0,1000),retentionUntil:'',notes:`Recovery drill result: ${b.result}. ${String(b.notes||'').slice(0,800)}`,createdBy:actor});
 }
}
