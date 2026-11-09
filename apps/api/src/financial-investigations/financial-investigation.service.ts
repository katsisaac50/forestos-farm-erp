import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { FinancialInvestigation } from './financial-investigation.schema';
import { CreateFinancialInvestigationDto, UpdateFinancialInvestigationDto } from './dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FinancialInvestigationService {
 constructor(@InjectModel(FinancialInvestigation.name) private model:Model<FinancialInvestigation>, private audit:AuditService){}
 list(month?:string,status?:string){
  if(month&&!/^\\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new BadRequestException('month must use YYYY-MM format');
  const filter:any={}; if(month)filter.month=month; if(status)filter.status=status;
  return this.model.find(filter).sort({dueDate:1,createdAt:-1}).limit(500).lean();
 }
 async create(dto:CreateFinancialInvestigationDto,actor:string){
  const due=new Date(dto.dueDate); if(!Number.isFinite(due.getTime()))throw new BadRequestException('Invalid due date');
  const item=await this.model.create({...dto,investigationId:randomUUID(),dueDate:due,status:'Open',history:[{at:new Date(),actor,action:'CREATED',details:'Investigation opened'}]});
  await this.audit.record(actor,'FINANCIAL_INVESTIGATION_CREATED','FinancialInvestigation',item.investigationId,`Opened investigation: ${item.title}`,{month:item.month,exceptionType:item.exceptionType,priority:item.priority});
  return item.toObject();
 }
 async update(id:string,dto:UpdateFinancialInvestigationDto,actor:string){
  const item=await this.model.findOne({investigationId:id}); if(!item)throw new NotFoundException('Investigation not found');
  if(dto.status==='Resolved'&&!String(dto.resolutionNote||item.resolutionNote||'').trim())throw new BadRequestException('A resolution note is required before marking resolved');
  if(dto.status==='Closed - reviewed'&&!String(dto.reviewNote||'').trim())throw new BadRequestException('A review note is required before closing');
  const before={status:item.status,priority:item.priority,assignedTo:item.assignedTo,dueDate:item.dueDate};
  const allowed:any={};
  for(const key of ['priority','status','assignedTo','evidenceReference','resolutionNote'] as const)if(dto[key]!==undefined)allowed[key]=dto[key];
  if(dto.dueDate)allowed.dueDate=new Date(dto.dueDate);
  if(dto.status==='Resolved'){allowed.resolvedBy=actor;allowed.resolvedAt=new Date();}
  if(dto.status==='Closed - reviewed'){allowed.reviewedBy=actor;allowed.reviewedAt=new Date();}
  Object.assign(item,allowed);
  item.history=[...(item.history||[]),{at:new Date(),actor,action:'UPDATED',before,changes:allowed,reviewNote:dto.reviewNote||''}];
  await item.save();
  await this.audit.record(actor,'FINANCIAL_INVESTIGATION_UPDATED','FinancialInvestigation',item.investigationId,`Updated investigation: ${item.title}`,{before,changes:allowed,reviewNote:dto.reviewNote||''});
  return item.toObject();
 }
}
