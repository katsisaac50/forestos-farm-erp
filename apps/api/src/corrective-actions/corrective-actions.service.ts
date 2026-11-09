import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCorrectiveActionDto, CreateFromInspectionDto, ReviewCorrectiveActionDto, UpdateCorrectiveActionDto } from './dto';
import { FieldInspection, FieldInspectionDocument } from '../field-inspections/field-inspection.schema';
import { CorrectiveAction, CorrectiveActionDocument } from './corrective-action.schema';
@Injectable()
export class CorrectiveActionsService {
 constructor(@InjectModel(CorrectiveAction.name) private readonly model:Model<CorrectiveActionDocument>, @InjectModel(FieldInspection.name) private readonly inspections:Model<FieldInspectionDocument>){}
 private actor(u:any):string{return String(u?.email||u?.username||u?.sub||'')}
 private owner(u:any):boolean{const r=u?.roles||(u?.role?[u.role]:[]);return Array.isArray(r)&&r.includes('owner')}
 async create(d:CreateCorrectiveActionDto,u:any){
  const assignedTo=d.assignedTo.trim(); if(!assignedTo)throw new BadRequestException('Assigned worker is required.');
  const dueAt=new Date(d.dueAt);if(!Number.isFinite(dueAt.getTime()))throw new BadRequestException('Invalid due date.');
  return this.model.create({...d,title:d.title.trim(),description:d.description.trim(),assignedTo,dueAt,
   farmBlock:d.farmBlock?.trim()||undefined,locationLabel:d.locationLabel?.trim()||undefined,
   sourceInspectionId:d.sourceInspectionId?.trim()||undefined,createdBy:this.actor(u),status:'open'});
 }
 async createFromInspection(inspectionId:string,d:CreateFromInspectionDto,u:any){
  const inspection=await this.inspections.findById(inspectionId).lean() as any;
  if(!inspection)throw new NotFoundException('Field inspection not found.');
  if(!this.owner(u)&&String(inspection.assignedTo||'').toLowerCase()!==this.actor(u).toLowerCase())throw new ForbiddenException('You can create actions only from inspections assigned to your account.');
  if(!['submitted','verified','rejected'].includes(inspection.status))throw new BadRequestException('Inspection must be submitted, verified or rejected before an action can be created.');
  const assignedTo=String(d.assignedTo||'').trim();if(!assignedTo)throw new BadRequestException('Assigned worker is required.');
  const dueAt=new Date(d.dueAt);if(!Number.isFinite(dueAt.getTime()))throw new BadRequestException('Invalid due date.');
  const existing=await this.model.findOne({sourceInspectionId:String(inspection._id),status:{$ne:'closed'}}).lean();
  if(existing)throw new BadRequestException('An unresolved corrective action already exists for this inspection. Close it before creating a follow-up.');
  const findings=String(inspection.findings||'').trim();const recommendation=String(inspection.correctiveAction||'').trim();
  const title=('Follow-up: '+String(inspection.title||'Field inspection')).slice(0,120);
  const description=[findings?`Finding: ${findings}`:'',recommendation?`Recommended action: ${recommendation}`:'',!findings&&!recommendation?'Follow up on the inspection findings and document the corrective work.':''].filter(Boolean).join('\n').slice(0,1000);
  return this.model.create({title,description,priority:d.priority,assignedTo,dueAt,farmBlock:inspection.blockCode?.trim()||undefined,locationLabel:inspection.locationLabel?.trim()||undefined,sourceInspectionId:String(inspection._id),createdBy:this.actor(u),status:'open'});
 }
 async list(u:any){const q=this.owner(u)?{}:{assignedTo:this.actor(u)};const rs=await this.model.find(q).sort({dueAt:1}).limit(2000).lean();const now=Date.now();return rs.map((r:any)=>({...r,overdue:r.status!=='closed'&&new Date(r.dueAt).getTime()<now}))}
 async update(id:string,d:UpdateCorrectiveActionDto,u:any){
  const r=await this.model.findById(id);if(!r)throw new NotFoundException('Corrective action not found.');
  if(!this.owner(u)&&r.assignedTo.toLowerCase()!==this.actor(u).toLowerCase())throw new ForbiddenException('You can update only actions assigned to your account.');
  if(r.status==='closed')throw new BadRequestException('Closed actions cannot be edited.');
  if(d.status==='submitted'&&!d.completionNote?.trim())throw new BadRequestException('Add a completion note before submission.');
  r.status=d.status;if(d.completionNote!==undefined)r.completionNote=d.completionNote.trim();
  if(d.status==='submitted')r.submittedAt=new Date();if(d.status==='in_progress')r.reviewNote='';
  await r.save();return r;
 }
 async review(id:string,d:ReviewCorrectiveActionDto,u:any){
  if(!this.owner(u))throw new ForbiddenException('Owner access is required.');
  const r=await this.model.findById(id);if(!r)throw new NotFoundException('Corrective action not found.');
  if(r.status!=='submitted')throw new BadRequestException('Only submitted actions can be reviewed.');
  if(!d.reviewNote.trim())throw new BadRequestException('Review note is required.');
  r.status=d.status;r.reviewNote=d.reviewNote.trim();
  if(d.status==='closed'){r.closedAt=new Date();r.closedBy=this.actor(u)}else{r.closedAt=undefined;r.closedBy=undefined}
  await r.save();return r;
 }
 async analytics(u:any){
  const rs=await this.model.find(this.owner(u)?{}:{assignedTo:this.actor(u)}).limit(5000).lean() as any[];
  const status:any={open:0,in_progress:0,submitted:0,closed:0},priority:any={low:0,medium:0,high:0,critical:0},blocks:any={};
  let overdue=0,onTime=0,late=0;const now=Date.now();
  for(const r of rs){if(status[r.status]!==undefined)status[r.status]++;if(priority[r.priority]!==undefined)priority[r.priority]++;
   const b=r.farmBlock||r.locationLabel||'Unassigned location';blocks[b]=(blocks[b]||0)+1;
   if(r.status!=='closed'&&new Date(r.dueAt).getTime()<now)overdue++;
   if(r.status==='closed'&&r.closedAt){if(new Date(r.closedAt).getTime()<=new Date(r.dueAt).getTime())onTime++;else late++}
  }
  return {total:rs.length,byStatus:status,byPriority:priority,byBlock:blocks,overdue,closedOnTime:onTime,closedLate:late,
   completionRate:rs.length?Math.round(status.closed/rs.length*100):0,onTimeClosureRate:onTime+late?Math.round(onTime/(onTime+late)*100):null,generatedAt:new Date().toISOString()};
 }
}
