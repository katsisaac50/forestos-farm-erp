import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {NotificationPolicy} from './notification-policy.schema';
import {NotificationPolicyEvent} from './notification-policy-event.schema';
import {EvidenceRecoveryIncident} from '../case-evidence/evidence-recovery-incident.schema';

const allowedSeverities=['critical','high','medium','low'];
const allowedChannels=['webhook','internal_log'];
@Injectable()
export class NotificationPoliciesService {
 constructor(
  @InjectModel(NotificationPolicy.name) private policies:Model<NotificationPolicy>,
  @InjectModel(NotificationPolicyEvent.name) private events:Model<NotificationPolicyEvent>,
  @InjectModel(EvidenceRecoveryIncident.name) private incidents:Model<EvidenceRecoveryIncident>,
 ){}
 private clean(body:any, partial=false){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('A policy object is required');
  const out:any={};
  if(!partial||body.name!==undefined){const v=String(body.name||'').trim();if(!v||v.length>120)throw new BadRequestException('name is required and must be at most 120 characters');out.name=v;}
  if(!partial||body.description!==undefined){const v=String(body.description||'').trim();if(!v||v.length>500)throw new BadRequestException('description is required and must be at most 500 characters');out.description=v;}
  if(!partial||body.severity!==undefined){if(!allowedSeverities.includes(body.severity))throw new BadRequestException('severity must be critical, high, medium, or low');out.severity=body.severity;}
  for(const [key,min,max,def] of [['dueSoonDays',1,30,1],['overdueRepeatHours',1,720,24],['approvalWaitingHours',1,720,24]] as any[]){
   if(!partial||body[key]!==undefined){const v=Number(body[key]??def);if(!Number.isInteger(v)||v<min||v>max)throw new BadRequestException(`${key} must be an integer between ${min} and ${max}`);out[key]=v;}
  }
  if(!partial||body.enabled!==undefined){if(body.enabled!==undefined&&typeof body.enabled!=='boolean')throw new BadRequestException('enabled must be boolean');out.enabled=body.enabled??true;}
  if(!partial||body.recipients!==undefined){
   const raw=body.recipients??[];if(!Array.isArray(raw)||raw.length>50)throw new BadRequestException('recipients must be an array with at most 50 entries');
   const vals=raw.map((x:any)=>String(x).trim().slice(0,160)).filter(Boolean);
   if(vals.some((x:string)=>/[\r\n]/.test(x)))throw new BadRequestException('recipients cannot contain line breaks');
   out.recipients=[...new Set(vals)];
  }
  if(!partial||body.channels!==undefined){
   const raw=body.channels??['internal_log'];if(!Array.isArray(raw)||raw.length===0||raw.some((x:any)=>!allowedChannels.includes(x)))throw new BadRequestException('channels must contain webhook and/or internal_log');
   out.channels=[...new Set(raw)];
  }
  return out;
 }
 async list(){
  const rows=await this.policies.find({}).sort({severity:1,policyKey:1}).lean();
  return {items:rows,total:rows.length,notice:'Policies are configuration records. The escalation evaluator must explicitly consume them before they affect delivery.'};
 }
 async create(body:any,actor:string){
  const policyKey=String(body?.policyKey||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(policyKey))throw new BadRequestException('policyKey must be 3–64 lowercase letters, numbers, underscores, or hyphens');
  const reason=String(body?.reason||'').trim();if(reason.length<10||reason.length>1000)throw new BadRequestException('A change reason of 10–1000 characters is required');
  const data=this.clean(body);
  try{
   const doc=await this.policies.create({...data,policyKey,recordVersion:1,updatedBy:actor});
   await this.events.create({policyKey,actor,action:'created',reason,before:null,after:this.snapshot(doc),newVersion:1});
   return doc.toObject();
  }catch(e:any){if(e?.code===11000)throw new ConflictException('A policy with this key already exists');throw e;}
 }
 async update(policyKey:string,body:any,actor:string){
  const key=String(policyKey||'').trim().toLowerCase();const reason=String(body?.reason||'').trim();
  if(reason.length<10||reason.length>1000)throw new BadRequestException('A change reason of 10–1000 characters is required');
  const expected=Number(body?.expectedVersion);if(!Number.isInteger(expected)||expected<1)throw new BadRequestException('expectedVersion is required for optimistic concurrency');
  const before:any=await this.policies.findOne({policyKey:key}).lean();if(!before)throw new NotFoundException('Notification policy not found');
  if(before.recordVersion!==expected)throw new ConflictException('Policy changed since it was loaded; refresh and try again');
  const patch=this.clean(body,true);if(!Object.keys(patch).length)throw new BadRequestException('No policy fields to update');
  const after:any=await this.policies.findOneAndUpdate({policyKey:key,recordVersion:expected},{$set:{...patch,updatedBy:actor},$inc:{recordVersion:1}},{new:true,runValidators:true}).lean();
  if(!after)throw new ConflictException('Policy changed concurrently; refresh and try again');
  const action=patch.enabled===true?'enabled':patch.enabled===false?'disabled':'updated';
  await this.events.create({policyKey:key,actor,action,reason,before:this.snapshot(before),after:this.snapshot(after),previousVersion:expected,newVersion:after.recordVersion});
  return after;
 }
 async history(policyKey:string,limit=100){
  const key=String(policyKey||'').trim().toLowerCase();const n=Math.max(1,Math.min(500,Math.floor(Number(limit)||100)));
  return this.events.find({policyKey:key}).sort({createdAt:-1}).limit(n).lean();
 }

 async evaluate(actor='system:policy-evaluator',dryRun=true){
  const policies:any[]=await this.policies.find({enabled:true}).sort({severity:1,policyKey:1}).lean();
  const now=new Date();
  const openIncidents:any[]=await this.incidents.find({status:{$ne:'closed'}}).sort({dueDate:1,updatedAt:1}).limit(2000).lean();
  const results:any[]=[];
  for(const incident of openIncidents){
   const due=incident.dueDate?new Date(incident.dueDate):null;
   const daysOverdue=due&&due<now?Math.floor((now.getTime()-due.getTime())/86400000):0;
   const daysUntilDue=due&&due>=now?Math.ceil((due.getTime()-now.getTime())/86400000):null;
   const candidates=policies.filter(p=>p.severity===incident.severity);
   const matching=candidates.find(p=>{
    if(incident.status==='awaiting_approval'){
     const updated=incident.updatedAt?new Date(incident.updatedAt):new Date(incident.createdAt||now);
     return (now.getTime()-updated.getTime())>=Number(p.approvalWaitingHours||24)*3600000;
    }
    if(daysOverdue>0)return daysOverdue*24>=Number(p.overdueRepeatHours||24);
    if(daysUntilDue!==null)return daysUntilDue<=Number(p.dueSoonDays||1);
    return !String(incident.assignedTo||'').trim() && ['critical','high'].includes(incident.severity);
   });
   if(!matching)continue;
   results.push({incidentId:String(incident._id),incidentCode:incident.incidentCode,severity:incident.severity,status:incident.status,policyKey:matching.policyKey,policyVersion:matching.recordVersion,recipients:matching.recipients||[],channels:matching.channels||['internal_log'],dueDate:incident.dueDate||null,daysOverdue,reason:incident.status==='awaiting_approval'?'approval_waiting':daysOverdue>0?'overdue':daysUntilDue!==null?'due_soon':'unassigned'});
  }
  return {evaluatedAt:now.toISOString(),actor,dryRun:true,mode:'preview_only',policiesEvaluated:policies.length,incidentsScanned:openIncidents.length,scanTruncated:openIncidents.length===2000,matches:results.length,results,notice:'This evaluation previews policy matches. It does not enqueue or send notifications.'};
 }

 private snapshot(v:any){if(!v)return null;const o:any={};for(const k of ['policyKey','name','description','severity','enabled','dueSoonDays','overdueRepeatHours','approvalWaitingHours','recipients','channels','recordVersion','updatedBy'])o[k]=v[k];return o;}
}
