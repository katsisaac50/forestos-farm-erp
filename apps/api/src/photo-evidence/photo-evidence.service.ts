import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { PhotoEvidence, PhotoEvidenceDocument } from './photo-evidence.schema';
const MAX_BYTES=4_000_000;
const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
@Injectable()
export class PhotoEvidenceService {
 private readonly root=process.env.FORESTOS_EVIDENCE_DIR || join(process.cwd(),'private-evidence');
 constructor(@InjectModel(PhotoEvidence.name) private readonly records:Model<PhotoEvidenceDocument>){
  if(!existsSync(this.root))mkdirSync(this.root,{recursive:true,mode:0o700});
 }
 async list(actor:string,owner:boolean){
  if(owner)return this.records.find().sort({createdAt:-1}).limit(250).lean();
  if(!actor)return [];
  return this.records.find({uploadedBy:actor}).sort({createdAt:-1}).limit(100).lean();
 }
 async upload(file:any,meta:any,actor:string){
  if(!actor)throw new ForbiddenException('A signed-in user is required.');
  if(!file || !file.buffer)throw new BadRequestException('A photo file is required.');
  if(!ALLOWED.has(String(file.mimetype)))throw new BadRequestException('Only JPEG, PNG and WebP images are accepted.');
  if(file.size>MAX_BYTES || file.buffer.length>MAX_BYTES)throw new BadRequestException('Image must be 4 MB or smaller after compression.');
  const hash=createHash('sha256').update(file.buffer).digest('hex');
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as any)[file.mimetype]||'bin';
  const storedName=randomUUID()+'.'+ext;
  const originalName=basename(String(file.originalname||'photo').replace(/[^a-zA-Z0-9._-]/g,'_')).slice(0,180)||'photo';
  const path=join(this.root,storedName);
  writeFileSync(path,file.buffer,{mode:0o600,flag:'wx'});
  try {
   return await this.records.create({runId:String(meta.runId).trim(),farmBlock:String(meta.farmBlock).trim(),uploadedBy:actor,originalName,storedName,mimeType:file.mimetype,sizeBytes:file.size,sha256:hash,caption:String(meta.caption||'').slice(0,1000),reviewStatus:'pending_review'});
  } catch(e) { try{unlinkSync(path)}catch{}; throw e; }
 }
 async getFile(id:string,actor:string,owner:boolean){
  const row=await this.records.findById(id);
  if(!row)throw new NotFoundException('Photo evidence not found.');
  if(!owner && row.uploadedBy!==actor)throw new ForbiddenException('You cannot access this evidence file.');
  const path=join(this.root,row.storedName);
  if(!existsSync(path))throw new NotFoundException('Evidence file is missing from storage.');
  return {buffer:readFileSync(path),mimeType:row.mimeType,filename:row.originalName};
 }
 async review(id:string,dto:any,actor:string,approve:boolean){
  const note=String(dto.reviewNote||'').trim();
  if(!note)throw new BadRequestException('A review note is required.');
  const row=await this.records.findById(id);
  if(!row)throw new NotFoundException('Photo evidence not found.');
  if(row.reviewStatus!=='pending_review')throw new BadRequestException('Only pending evidence can be reviewed.');
  row.reviewStatus=approve?'approved':'rejected';
  row.reviewedBy=actor;
  row.reviewNote=note;
  row.reviewedAt=new Date();
  return row.save();
}
}
