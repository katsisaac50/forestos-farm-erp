import {Injectable,NotFoundException} from '@nestjs/common';import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';import {FieldLog} from './field-log.schema';import {CreateFieldLogDto} from './dto';
@Injectable() export class FieldLogsService {
 constructor(@InjectModel(FieldLog.name) private model:Model<FieldLog>){}
 findAll(){return this.model.find().sort({date:-1}).limit(500).lean();}
 async create(dto:CreateFieldLogDto){
  try {
   return await this.model.findOneAndUpdate(
    {logId:dto.logId},
    {$setOnInsert:dto},
    {upsert:true,new:true,runValidators:true}
   ).lean();
  } catch(error) {
   if(typeof error==='object'&&error!==null&&'code' in error&&error.code===11000){
    const existing=await this.model.findOne({logId:dto.logId}).lean();
    if(existing)return existing;
   }
   throw error;
  }
 }
 async update(id:string,dto:Partial<CreateFieldLogDto>){const x=await this.model.findByIdAndUpdate(id,dto,{new:true,runValidators:true}).lean();if(!x)throw new NotFoundException('Field log not found');return x;}
}
