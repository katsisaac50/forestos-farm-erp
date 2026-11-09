import {ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';
import {Evidence} from './evidence.schema';import {CreateEvidenceDto} from './dto';
@Injectable()
export class EvidenceService {
 constructor(@InjectModel(Evidence.name) private model:Model<Evidence>){}
 async list(inspectionId:string|undefined,user:{email:string;role:string}){const filter:any={};if(inspectionId)filter.inspectionId=inspectionId;if(user.role!=='owner')filter.uploadedBy=user.email.toLowerCase();return this.model.find(filter).select('-dataBase64').sort({capturedAt:-1}).limit(100).lean();}
 async create(dto:CreateEvidenceDto,user:{email:string;role:string}){
  const raw=String(dto.dataBase64||'').replace(/^data:image\/(jpeg|png|webp);base64,/,'');
  if(!raw||raw.length>5_000_000)throw new ForbiddenException('Image payload too large (max about 3.5 MB encoded image)');
  const buf=Buffer.from(raw,'base64');if(!buf.length||buf.length>3_500_000)throw new ForbiddenException('Image must be smaller than 3.5 MB');
  return this.model.create({...dto,dataBase64:raw,uploadedBy:user.email.toLowerCase(),capturedAt:dto.capturedAt?new Date(dto.capturedAt):new Date()});
 }
 async image(id:string,user:{email:string;role:string}){const filter:any={_id:id};if(user.role!=='owner')filter.uploadedBy=user.email.toLowerCase();const doc=await this.model.findOne(filter).lean();if(!doc)throw new NotFoundException('Evidence not found');return doc;}
}
