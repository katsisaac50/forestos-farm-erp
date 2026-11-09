import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SopTemplate, SopRun } from './sop.schema';
import { Plantation } from '../plantations/plantation.schema';
import { Hive } from '../hives/hive.schema';
import { Inspection } from '../inspections/inspection.schema';

const streams=['Eucalyptus','Beekeeping','General'];
const cadences=['daily','weekly','monthly','event_based'];
const templateSeeds=[
 {sopCode:'EUC-DAILY-001',title:'Eucalyptus block walk and hazard check',workstream:'Eucalyptus',cadence:'daily',purpose:'Check the block for visible hazards and urgent work needs.',ownerRole:'Field worker / supervisor',safetyNotes:'Do not enter unsafe areas during storms or fire conditions.',checklist:[['boundary','Walk agreed accessible boundary and note access issues',true,'Do not cross unsafe or disputed boundaries.'],['fire','Look for smoke, burn marks, dry fuel build-up or fire hazards',true,'Escalate smoke/fire immediately using local emergency procedures.'],['damage','Check for visible damage, pests, disease or unusual tree decline',true,'Record affected area and photo reference where safe.'],['access','Check paths, drainage and access for safe movement',true,'Do not operate machinery without training.'],['followup','Record actions, responsible person and due date for exceptions',true,'Do not mark a problem resolved without checking it.']]},
 {sopCode:'EUC-WEEKLY-001',title:'Eucalyptus survival and growth sample',workstream:'Eucalyptus',cadence:'weekly',purpose:'Record a repeatable sample of live and dead trees for management review.',ownerRole:'Supervisor',safetyNotes:'Use the same sample method and marked locations over time.',checklist:[['sample','Use the recorded sample locations and method',true,'Do not extrapolate a small convenience sample as a verified whole-farm count.'],['live','Count live trees in the sample',true,'Record actual count and sample size.'],['dead','Count dead or missing trees in the sample',true,'Separate dead, missing and not assessed if known.'],['growth','Record height/DBH only where trained and measured consistently',false,'Use suitable tools and units.'],['decision','Record replanting, pest or maintenance recommendations',true,'Replanting decisions should consider season, survival and cost.']]},
 {sopCode:'BEE-WEEKLY-001',title:'Apiary external inspection',workstream:'Beekeeping',cadence:'weekly',purpose:'Check apiary access, hive exterior, security and visible colony warning signs.',ownerRole:'Beekeeper / supervisor',safetyNotes:'Use suitable protective equipment; avoid opening hives in unsafe weather or without appropriate training.',checklist:[['ppe','Confirm protective clothing and safe inspection conditions',true,'Stop if conditions or equipment are unsafe.'],['access','Check apiary access, security and animal/human disturbance',true,'Record hazards and keep bystanders at a safe distance.'],['hive','Check hive body, stand, roof, water ingress and damage externally',true,'Do not open a hive if not trained or conditions are unsuitable.'],['activity','Observe entrance activity and unusual signs without over-disturbing',true,'Record observations, not unsupported diagnoses.'],['action','Record any need for a trained internal inspection or repair',true,'Escalate suspected disease or unusual colony loss to qualified local support.']]},
 {sopCode:'BEE-MONTHLY-001',title:'Apiary colony and equipment review',workstream:'Beekeeping',cadence:'monthly',purpose:'Review colony status, inspection due dates, equipment condition and harvest records.',ownerRole:'Beekeeper / supervisor',safetyNotes:'Follow locally appropriate beekeeping and food hygiene practices.',checklist:[['records','Review each hive record and last inspection date',true,'Update records only from observed evidence.'],['colony','Flag weak, queenless, absconded or unknown statuses for follow-up',true,'Do not assume colony status without an inspection.'],['equipment','Check protective gear, smoker and hive tools condition',true,'Repair or replace unsafe equipment before use.'],['harvest','Reconcile recorded honey harvest with dated harvest notes',false,'Do not harvest solely to meet a target; colony condition comes first.'],['followup','Assign follow-up and due date for each issue',true,'Use a trained beekeeper for technical decisions.']]},
 {sopCode:'GEN-WEEKLY-001',title:'Weekly farm management review',workstream:'General',cadence:'weekly',purpose:'Review exceptions, safety, stock, maintenance and unfinished tasks.',ownerRole:'Owner / supervisor',safetyNotes:'Prioritise immediate safety and environmental risks.',checklist:[['alerts','Review unresolved critical/high alerts',true,'Verify source records before corrective action.'],['tasks','Review overdue tasks and assign accountable owners',true,'Agree a realistic due date.'],['stock','Review low-stock list and physically verify important items',true,'Do not order based only on a system warning.'],['maintenance','Review overdue maintenance and unsafe assets',true,'Remove unsafe assets from use until assessed.'],['cash','Review cash records and upcoming commitments',true,'Use recorded figures as estimates until reconciled.'],['actions','Record decisions, owner and due date for every action',true,'Close actions only when evidence supports closure.']]}
];
@Injectable()
export class StandardOperatingProceduresService {
 constructor(
  @InjectModel(SopTemplate.name) private templates:Model<any>,
  @InjectModel(SopRun.name) private runs:Model<any>,
  @InjectModel(Plantation.name) private plantations:Model<any>,
  @InjectModel(Hive.name) private hives:Model<any>,
  @InjectModel(Inspection.name) private inspections:Model<any>,
 ){}
 async seedDefaults(actor:string){
  const result=[];
  for(const seed of templateSeeds){
   const checklist=seed.checklist.map((x:any)=>({code:x[0],label:x[1],required:x[2],guidance:x[3]}));
   const row=await this.templates.findOneAndUpdate({sopCode:seed.sopCode},{$setOnInsert:{...seed,checklist,status:'active',createdBy:actor}},{upsert:true,new:true,setDefaultsOnInsert:true});
   result.push(row);
  }
  return {message:'Default SOPs are present. Existing templates were not overwritten.',templates:result};
 }
 async listTemplates(){return this.templates.find().sort({workstream:1,sopCode:1}).limit(500).lean();}
 async createTemplate(body:any,actor:string){
  const code=String(body?.sopCode||'').trim(),title=String(body?.title||'').trim();
  if(!code||!title||!streams.includes(body.workstream)||!cadences.includes(body.cadence))throw new BadRequestException('sopCode, title, valid workstream and cadence are required');
  if(!Array.isArray(body.checklist)||!body.checklist.length)throw new BadRequestException('At least one checklist item is required');
  const checklist=body.checklist.slice(0,100).map((x:any,i:number)=>{const label=String(x?.label||'').trim();if(!label)throw new BadRequestException(`Checklist item ${i+1} needs a label`);return {code:String(x.code||`item-${i+1}`).slice(0,60),label:label.slice(0,300),required:x.required!==false,guidance:String(x.guidance||'').slice(0,500)};});
  return this.templates.create({sopCode:code,title,workstream:body.workstream,cadence:body.cadence,purpose:String(body.purpose||'').slice(0,1000),ownerRole:String(body.ownerRole||'').slice(0,120),safetyNotes:String(body.safetyNotes||'').slice(0,1500),checklist,status:'draft',createdBy:actor});
 }
 async activateTemplate(id:string,body:any){
  const t=await this.templates.findById(id);if(!t)throw new NotFoundException('SOP template not found');
  if(!['active','draft','retired'].includes(body?.status))throw new BadRequestException('Invalid template status');
  t.status=body.status;return t.save();
 }
 async createRun(body:any,actor:string){
  const template=await this.templates.findById(String(body?.templateId||''));if(!template)throw new NotFoundException('SOP template not found');
  if(template.status!=='active')throw new BadRequestException('Only active SOP templates can be scheduled');
  const date=String(body?.scheduledDate||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))throw new BadRequestException('scheduledDate must be YYYY-MM-DD');
  const site=String(body?.siteOrBlock||'').trim(),assigned=String(body?.assignedTo||'').trim();if(!site||!assigned)throw new BadRequestException('siteOrBlock and assignedTo are required');
  return this.runs.create({templateId:String(template._id),sopCode:template.sopCode,title:template.title,workstream:template.workstream,siteOrBlock:site.slice(0,160),scheduledDate:date,assignedTo:assigned.slice(0,160),status:'open',checklistResults:template.checklist.map((x:any)=>({code:x.code,label:x.label,result:'not_done',note:'',evidenceReference:''})),createdBy:actor});
 }
 async listRuns(query:any){
  const filter:any={};if(query?.status)filter.status=String(query.status);if(query?.workstream)filter.workstream=String(query.workstream);if(query?.from||query?.to){filter.scheduledDate={};if(query.from)filter.scheduledDate.$gte=String(query.from);if(query.to)filter.scheduledDate.$lte=String(query.to);}
  return this.runs.find(filter).sort({scheduledDate:-1,createdAt:-1}).limit(1000).lean();
 }
 async updateRun(id:string,body:any,actor:string,role:string){
  const run=await this.runs.findById(id);if(!run)throw new NotFoundException('SOP run not found');
  if(['verified','cancelled'].includes(run.status))throw new BadRequestException('Verified or cancelled runs cannot be edited; reopen through an owner review process');
  if(body?.status==='in_progress'){if(role!=='owner'&&String(run.assignedTo).toLowerCase()!==actor.toLowerCase())throw new ForbiddenException('Only the assigned person or owner can update this run');run.status='in_progress';}
  if(body?.checklistResults!==undefined){
   if(role!=='owner'&&String(run.assignedTo).toLowerCase()!==actor.toLowerCase())throw new ForbiddenException('Only the assigned person or owner can update checklist results');
   if(!Array.isArray(body.checklistResults))throw new BadRequestException('checklistResults must be an array');
   const supplied=new Map(body.checklistResults.map((x:any)=>[String(x.code),x]));
   run.checklistResults=run.checklistResults.map((old:any)=>{const x:any=supplied.get(old.code);if(!x)return old;const result=['done','not_done','not_applicable'].includes(x.result)?x.result:old.result;return {...old.toObject?.()||old, result,note:String(x.note||'').slice(0,1000),evidenceReference:String(x.evidenceReference||'').slice(0,300)};}) as any;
  }
  if(body?.status==='submitted'){
   if(role!=='owner'&&String(run.assignedTo).toLowerCase()!==actor.toLowerCase())throw new ForbiddenException('Only the assigned person or owner can submit this run');
   const missing=(run.checklistResults as any[]).filter(x=>x.required&&x.result==='not_done');
   if(missing.length)throw new BadRequestException(`Complete or explain required checklist items before submission: ${missing.map(x=>x.label).join('; ')}`);
   run.status='submitted';run.submittedBy=actor;run.submittedAt=new Date();run.completionSummary=String(body.completionSummary||'').slice(0,2000);run.exceptionNotes=String(body.exceptionNotes||'').slice(0,2000);run.evidenceReference=String(body.evidenceReference||'').slice(0,500);
  }
  if(body?.status==='verified'){
   if(role!=='owner')throw new ForbiddenException('Only the owner can verify submitted work');
   if(run.status!=='submitted')throw new BadRequestException('Only submitted work can be verified');
   run.status='verified';run.verifiedBy=actor;run.verifiedAt=new Date();run.verificationNote=String(body.verificationNote||'').slice(0,1500);
  }
  if(body?.status==='rejected'){
   if(role!=='owner')throw new ForbiddenException('Only the owner can reject submitted work');
   if(run.status!=='submitted')throw new BadRequestException('Only submitted work can be rejected');
   const note=String(body.verificationNote||'').trim();if(!note)throw new BadRequestException('A verification note is required when rejecting work');
   run.status='rejected';run.verifiedBy=actor;run.verifiedAt=new Date();run.verificationNote=note.slice(0,1500);
  }
  return run.save();
 }
 async overview(){
  const [templates,runs,plantations,hives,inspections]=await Promise.all([
   this.templates.find({status:'active'}).limit(500).lean(),
   this.runs.find().sort({scheduledDate:-1}).limit(2000).lean(),
   this.plantations.find().select('blockId location nextAction nextActionDue').limit(1000).lean(),
   this.hives.find().select('hiveId apiarySite colonyStatus nextInspectionDue repairsNeeded').limit(1000).lean(),
   this.inspections.find({status:{$ne:'Completed'}}).select('inspectionId title dueDate status priority assignedTo').limit(1000).lean(),
  ]);
  const today=new Date().toISOString().slice(0,10);
  const overdueRuns=runs.filter((r:any)=>r.scheduledDate<today&&!['verified','cancelled'].includes(r.status));
  const requiredTotal=runs.reduce((s:number,r:any)=>s+(r.checklistResults||[]).filter((x:any)=>x.required).length,0);
  const requiredDone=runs.reduce((s:number,r:any)=>s+(r.checklistResults||[]).filter((x:any)=>x.required&&x.result==='done').length,0);
  return {generatedAt:new Date().toISOString(),totals:{activeTemplates:templates.length,runs:runs.length,open:runs.filter((r:any)=>['open','in_progress','rejected'].includes(r.status)).length,submitted:runs.filter((r:any)=>r.status==='submitted').length,verified:runs.filter((r:any)=>r.status==='verified').length,overdue:overdueRuns.length,requiredChecklistCompletionPct:requiredTotal?Math.round(requiredDone/requiredTotal*100):0,plantationBlocks:plantations.length,hives:hives.length,nonCompletedInspections:inspections.length},overdueRuns:overdueRuns.slice(0,100),fieldContext:{plantationBlocks:plantations,hives,inspections:inspections.slice(0,100)}};
 }

 async myRuns(actorIdentifier:string){
  const actor=String(actorIdentifier||'').trim();
  if(!actor) return [];
  return this.runs.find({assignedTo:{$regex:new RegExp('^'+actor.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+'$','i')}})
   .sort({scheduledDate:1,createdAt:-1}).limit(100).lean();
 }
}
