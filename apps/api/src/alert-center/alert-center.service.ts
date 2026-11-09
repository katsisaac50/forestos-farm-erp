import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlertState, AlertStateDocument } from './alert.schema';
import { StockItem } from '../inventory-control/inventory.schema';
import { LabourTask } from '../workforce/workforce.schema';
import { WorkflowEvent } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceUpdate } from '../performance-strategy/performance.schema';
import { FarmRisk } from '../risk-management/risk.schema';

type Candidate={alertKey:string;alertType:string;severity:string;title:string;detail:string;sourcePath:string};
@Injectable()
export class AlertCenterService {
 constructor(
  @InjectModel(AlertState.name) private states:Model<AlertStateDocument>,
  @InjectModel(StockItem.name) private stock:Model<any>,
  @InjectModel(LabourTask.name) private tasks:Model<any>,
  @InjectModel(WorkflowEvent.name) private workflows:Model<any>,
  @InjectModel(PerformanceTarget.name) private targets:Model<any>,
  @InjectModel(PerformanceUpdate.name) private updates:Model<any>,
  @InjectModel(FarmRisk.name) private risks:Model<any>,
 ){}

 private today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 async refresh(actor:string){
  const today=this.today();
  const [items,tasks,failedWorkflows,pendingWorkflows,targets,updates,risks]=await Promise.all([
   this.stock.find().select('itemCode name quantityOnHand reorderLevel').limit(10000).lean(),
   this.tasks.find().select('taskCode title plannedDate status priority').limit(10000).lean(),
   this.workflows.find({status:'failed'}).select('eventCode eventType errorMessage status').limit(1000).lean(),
   this.workflows.find({status:'pending'}).select('eventCode eventType movementDate status').limit(1000).lean(),
   this.targets.find({status:'active'}).select('targetCode title periodStart periodEnd direction targetValue status').limit(1000).lean(),
   this.updates.find().sort({updateDate:-1,createdAt:-1}).limit(5000).lean(),
   this.risks.find({status:{$ne:'closed'}}).select('riskCode title likelihood impact residualLikelihood residualImpact status reviewDate').limit(1000).lean(),
  ]);
  const candidates:Candidate[]=[];
  for(const x of items){if(Number(x.quantityOnHand||0)<=Number(x.reorderLevel||0)) candidates.push({alertKey:`stock-low:${x._id}`,alertType:'low_stock',severity:Number(x.quantityOnHand||0)===0?'high':'medium',title:`Low stock: ${x.name}`,detail:`${x.itemCode}: on hand ${x.quantityOnHand||0}, reorder level ${x.reorderLevel||0}. Verify the physical stock and planned use.`,sourcePath:'/inventory-control'});}
  for(const t of tasks){if(String(t.plannedDate||'')<today&&!['verified','cancelled'].includes(t.status)) candidates.push({alertKey:`task-overdue:${t._id}`,alertType:'overdue_task',severity:['urgent','high'].includes(t.priority)?'high':'medium',title:`Overdue task: ${t.title}`,detail:`${t.taskCode} was planned for ${t.plannedDate}; current status is ${t.status}. Check with the assigned worker and record the outcome.`,sourcePath:'/workforce'});}
  for(const w of failedWorkflows) candidates.push({alertKey:`workflow-failed:${w._id}`,alertType:'workflow_failed',severity:'high',title:`Failed workflow: ${w.eventCode}`,detail:`${w.eventType}. ${String(w.errorMessage||'No error detail recorded').slice(0,350)}`,sourcePath:'/integration-workflows'});
  for(const w of pendingWorkflows){const age=Date.now()-new Date((w as any).createdAt||Date.now()).getTime();if(age>24*60*60*1000)candidates.push({alertKey:`workflow-pending:${w._id}`,alertType:'workflow_pending',severity:'medium',title:`Workflow pending over 24 hours: ${w.eventCode}`,detail:`${w.eventType} has remained pending. Verify source record and stock movement before retrying.`,sourcePath:'/integration-workflows'});}
  const latestById=new Map<string,any>();for(const u of updates){const id=String(u.targetId);if(!latestById.has(id))latestById.set(id,u);}
  for(const t of targets){const latest=latestById.get(String(t._id));const isExpired=String(t.periodEnd||'')<today;const noRecent=!latest||((Date.now()-new Date(latest.createdAt||latest.updateDate).getTime())>14*86400000);if(isExpired&&!latest)candidates.push({alertKey:`kpi-no-update:${t._id}`,alertType:'kpi_no_update',severity:'high',title:`KPI period ended without an update: ${t.title}`,detail:`${t.targetCode} ended ${t.periodEnd} and has no recorded actual. Validate whether the target is still relevant.`,sourcePath:'/performance-strategy'});else if(!isExpired&&noRecent)candidates.push({alertKey:`kpi-stale:${t._id}`,alertType:'kpi_stale',severity:'medium',title:`KPI update may be stale: ${t.title}`,detail:`${t.targetCode} has no update in the last 14 days. This is a review prompt, not a performance verdict.`,sourcePath:'/performance-strategy'});}
  for(const r of risks){const score=Number(r.residualLikelihood||r.likelihood||1)*Number(r.residualImpact||r.impact||1);const overdue=!!r.reviewDate&&String(r.reviewDate)<today;if(score>=15||overdue)candidates.push({alertKey:`risk-review:${r._id}`,alertType:'risk_review',severity:score>=20?'critical':score>=15?'high':'medium',title:`Risk review required: ${r.title}`,detail:`${r.riskCode||''} · status ${r.status}; score ${score}; ${overdue?'review date overdue.':'risk score requires attention.'} Confirm current controls and actions.`,sourcePath:'/risk-management'});}
  const now=new Date();
  for(const c of candidates){
   const existing=await this.states.findOne({alertKey:c.alertKey});
   if(existing){
    existing.alertType=c.alertType;existing.severity=c.severity;existing.title=c.title;existing.detail=c.detail;existing.sourcePath=c.sourcePath;existing.lastSeenAt=now;
    if(existing.state==='resolved') {existing.state='open';existing.resolvedAt=null;existing.resolutionNote='';existing.acknowledgedAt=null;existing.acknowledgedBy='';}
    existing.lastActionBy=actor;await existing.save();
   } else {
    await this.states.create({...c,firstSeenAt:now,lastSeenAt:now,state:'open',acknowledgedBy:'',acknowledgedAt:null,resolutionNote:'',resolvedAt:null,lastActionBy:actor});
   }
  }
  return this.dashboard();
 }
 async dashboard(){
  const rows=await this.states.find().sort({lastSeenAt:-1}).limit(2000).lean();
  return {generatedAt:new Date().toISOString(),totals:{total:rows.length,open:rows.filter(x=>x.state==='open').length,acknowledged:rows.filter(x=>x.state==='acknowledged').length,resolved:rows.filter(x=>x.state==='resolved').length,critical:rows.filter(x=>x.state!=='resolved'&&x.severity==='critical').length,high:rows.filter(x=>x.state!=='resolved'&&x.severity==='high').length},alerts:rows};
 }
 async act(id:string,body:any,actor:string){
  const state=String(body?.state||'');if(!['acknowledged','resolved','open'].includes(state))throw new BadRequestException('state must be acknowledged, resolved, or open');
  const row=await this.states.findById(id);if(!row)throw new NotFoundException('Alert not found');
  row.state=state;row.lastActionBy=actor;
  if(state==='acknowledged'){row.acknowledgedBy=actor;row.acknowledgedAt=new Date();}
  if(state==='resolved'){const note=String(body?.resolutionNote||'').trim();if(!note)throw new BadRequestException('A resolution note is required');row.resolutionNote=note.slice(0,1000);row.resolvedAt=new Date();}
  if(state==='open'){row.acknowledgedBy='';row.acknowledgedAt=null;row.resolutionNote='';row.resolvedAt=null;}
  return row.save();
 }
}
