import {Injectable,NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';
import {GrowthSample} from './growth.schema';import {CreateGrowthSampleDto} from './dto';import {Plantation} from '../plantations/plantation.schema';
import {OrganizationContext,requireOrganizationContext} from '../organizations/organization-context';
import {organizationFilter} from '../organizations/organization-scope';
@Injectable() export class GrowthService {
 constructor(@InjectModel(GrowthSample.name) private samples:Model<GrowthSample>,@InjectModel(Plantation.name) private blocks:Model<Plantation>){}
 async list(context:OrganizationContext,blockId?:string){
  const verified=requireOrganizationContext(context);
  return this.samples.find(organizationFilter(verified,blockId?{blockId}:{})).sort({sampleDate:-1}).limit(1000).lean();
 }
 async create(dto:CreateGrowthSampleDto,context:OrganizationContext,actorEmail:string){
  const verified=requireOrganizationContext(context);
  const block=await this.blocks.findOne(organizationFilter(verified,{blockId:dto.blockId})).lean();
  if(!block)throw new NotFoundException('Plantation block not found');
  const {organizationId:_ignored,recordedBy:_ignoredBy,...safe}=dto as any;
  return this.samples.create({...safe,organizationId:verified.organizationId,recordedBy:String(actorEmail||verified.userId).toLowerCase()});
 }
 async trend(blockId:string,context:OrganizationContext){
  const verified=requireOrganizationContext(context);
  const block=await this.blocks.findOne(organizationFilter(verified,{blockId})).lean();
  if(!block)throw new NotFoundException('Plantation block not found');
  const samples=await this.samples.find(organizationFilter(verified,{blockId})).sort({sampleDate:1}).lean();
  return {organizationId:verified.organizationId,blockId,areaAcres:block.areaAcres,samples:samples.map((s:any)=>({sampleDate:s.sampleDate,sampleCode:s.sampleCode,treeCount:s.treeCount,averageHeightM:s.averageHeightM,averageDbhCm:s.averageDbhCm,recordedBy:s.recordedBy})),note:'Growth samples are field measurements; they are not a timber-volume or revenue estimate.'};
 }
}
