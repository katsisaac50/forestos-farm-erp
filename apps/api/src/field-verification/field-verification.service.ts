import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FieldVerification, FieldVerificationDocument } from './field-verification.schema';
import { CreateFieldVerificationDto, ReviewFieldVerificationDto } from './field-verification.dto';
@Injectable()
export class FieldVerificationService {
 constructor(@InjectModel(FieldVerification.name) private readonly records:Model<FieldVerificationDocument>){}
 async list(actor:string,owner:boolean){
  if(owner)return this.records.find().sort({createdAt:-1}).limit(250).lean();
  const who=String(actor||'').trim();
  if(!who)return [];
  return this.records.find({$or:[{submittedBy:who},{workerIdentifier:who}]}).sort({createdAt:-1}).limit(100).lean();
 }
 async create(dto:CreateFieldVerificationDto,actor:string){
  const who=String(actor||'').trim();
  if(!who)throw new ForbiddenException('A signed-in actor identifier is required.');
  if(dto.latitude < -90 || dto.latitude > 90 || dto.longitude < -180 || dto.longitude > 180)throw new BadRequestException('GPS coordinates are out of range.');
  if(dto.accuracyMeters < 0 || dto.accuracyMeters > 100000)throw new BadRequestException('GPS accuracy is out of range.');
  if(dto.workerIdentifier.trim().toLowerCase()!==who.toLowerCase())throw new ForbiddenException('Worker identifier must match your login.');
  return this.records.create({...dto,submittedBy:who,reviewStatus:'submitted'});
 }
 async review(id:string,dto:ReviewFieldVerificationDto,actor:string,approve:boolean){
  const note=String(dto.reviewNote||'').trim();
  if(!note)throw new BadRequestException('A review note is required.');
  const row=await this.records.findById(id);
  if(!row)throw new NotFoundException('Field verification record not found.');
  if(row.reviewStatus!=='submitted')throw new BadRequestException('Only submitted records can be reviewed.');
  row.reviewStatus=approve?'approved':'rejected';row.reviewedBy=actor;row.reviewNote=note;row.reviewedAt=new Date();
  return row.save();
 }
}
