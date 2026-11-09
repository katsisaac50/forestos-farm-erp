import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialEscalation } from '../financial-escalations/financial-escalations.schema';
import { FinancialAction } from '../financial-action-centre/financial-action.schema';

@Injectable()
export class FinancialControlPerformanceService {
 constructor(
  @InjectModel(FinancialEscalation.name) private readonly escalations: Model<FinancialEscalation>,
  @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
 ) {}
 async report(requestedMonth?: string, requestedCompareTo?: string) {
  const month=requestedMonth || new Date().toISOString().slice(0,7);
  const compareTo=requestedCompareTo || this.previousMonth(month);
  this.validateMonth(month); this.validateMonth(compareTo);
  const [current, prior, actions, priorActions] = await Promise.all([
   this.escalations.find({month}).sort({createdAt:-1}).limit(1000).lean(),
   this.escalations.find({month:compareTo}).sort({createdAt:-1}).limit(1000).lean(),
   this.actions.find({month}).sort({createdAt:-1}).limit(1000).lean(),
   this.actions.find({month:compareTo}).sort({createdAt:-1}).limit(1000).lean(),
  ]);
  const now=new Date();
  const active=current.filter((x:any)=>x.status!=='Resolved');
  const priorActive=prior.filter((x:any)=>x.status!=='Resolved');
  const overdue=active.filter((x:any)=>x.dueDate && new Date(x.dueDate)<now);
  const weights:Record<string,number>={Critical:10,High:6,Medium:3};
  const riskScore=active.reduce((sum:number,x:any)=>{
   const ageDays=x.createdAt?Math.max(0,Math.floor((now.getTime()-new Date(x.createdAt).getTime())/86400000)):0;
   return sum+(weights[x.priority]||2)+(x.dueDate&&new Date(x.dueDate)<now?4:0)+(ageDays>=30?3:ageDays>=14?2:ageDays>=7?1:0);
  },0);
  const priorRiskScore=priorActive.reduce((sum:number,x:any)=>{
   const ageDays=x.createdAt?Math.max(0,Math.floor((now.getTime()-new Date(x.createdAt).getTime())/86400000)):0;
   return sum+(weights[x.priority]||2)+(x.dueDate&&new Date(x.dueDate)<now?4:0)+(ageDays>=30?3:ageDays>=14?2:ageDays>=7?1:0);
  },0);
  const durations=current.filter((x:any)=>x.status==='Resolved'&&x.resolvedAt&&x.createdAt)
   .map((x:any)=>Math.max(0,(new Date(x.resolvedAt).getTime()-new Date(x.createdAt).getTime())/86400000));
  const priorDurations=prior.filter((x:any)=>x.status==='Resolved'&&x.resolvedAt&&x.createdAt)
   .map((x:any)=>Math.max(0,(new Date(x.resolvedAt).getTime()-new Date(x.createdAt).getTime())/86400000));
  const average=(xs:number[])=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*10)/10:null;
  const patterns=new Map<string,{count:number;open:number;sourceType:string;label:string}>();
  for(const x of current as any[]){
   const label=String(x.reason||x.title||'Unspecified issue').trim();
   const key=`${x.sourceType||'Unknown'}|${label}`.toLowerCase().replace(/\s+/g,' ');
   const old=patterns.get(key)||{count:0,open:0,sourceType:x.sourceType||'Unknown',label};
   old.count++; if(x.status!=='Resolved') old.open++; patterns.set(key,old);
  }
  const repeatIssues=[...patterns.values()].filter(x=>x.count>1).sort((a,b)=>b.open-a.open||b.count-a.count).slice(0,20);
  const completed=actions.filter((x:any)=>x.status==='Completed').length;
  const completion=actions.length?Math.round(completed/actions.length*1000)/10:0;
  const targets=[
   {key:'criticalOpen',label:'Open critical escalations',actual:active.filter((x:any)=>x.priority==='Critical').length,target:0,direction:'lower'},
   {key:'overdueRatePercent',label:'Overdue rate',actual:active.length?Math.round(overdue.length/active.length*1000)/10:0,target:10,direction:'lower'},
   {key:'actionCompletionRatePercent',label:'Corrective action completion',actual:completion,target:80,direction:'higher'},
   {key:'averageResolutionDays',label:'Average resolution time (days)',actual:average(durations),target:14,direction:'lower'},
  ].map(x=>({...x,status:x.actual===null?'Insufficient data':(x.direction==='lower'?(x.actual as number)<=x.target:(x.actual as number)>=x.target)?'On target':'Needs attention'}));
  const warnings:string[]=[];
  if(current.length===1000||prior.length===1000||actions.length===1000||priorActions.length===1000) warnings.push('At least one query reached the 1,000-record limit; counts and rates may be incomplete.');
  if(!durations.length) warnings.push('No resolved escalation has both createdAt and resolvedAt timestamps; average resolution time is unavailable.');
  warnings.push('Risk score is a transparent prioritisation heuristic, not a monetary loss estimate or proof of control effectiveness.');
  warnings.push('Only records already stored for the selected month are analysed; this report does not refresh or create escalations.');
  return {
   month,compareTo,generatedAt:now.toISOString(),
   metrics:{
    totalEscalations:current.length,activeEscalations:active.length,overdueEscalations:overdue.length,
    criticalOpen:active.filter((x:any)=>x.priority==='Critical').length,
    highOpen:active.filter((x:any)=>x.priority==='High').length,
    weightedRiskScore:riskScore,priorWeightedRiskScore:priorRiskScore,riskScoreChange:riskScore-priorRiskScore,
    averageResolutionDays:average(durations),resolvedWithTimingData:durations.length,
    priorAverageResolutionDays:average(priorDurations),priorResolvedWithTimingData:priorDurations.length,
    actionCompletionRatePercent:completion,completedActions:completed,totalActions:actions.length,
    repeatedIssuePatterns:repeatIssues.length,activeRepeatIssuePatterns:repeatIssues.filter(x=>x.open>0).length,
   },
   targets,repeatIssues,
   topRisks:active.map((x:any)=>{
    const ageDays=x.createdAt?Math.max(0,Math.floor((now.getTime()-new Date(x.createdAt).getTime())/86400000)):0;
    return {...x,riskScore:(weights[x.priority]||2)+(x.dueDate&&new Date(x.dueDate)<now?4:0)+(ageDays>=30?3:ageDays>=14?2:ageDays>=7?1:0),ageDays,isOverdue:!!(x.dueDate&&new Date(x.dueDate)<now)};
   }).sort((a:any,b:any)=>b.riskScore-a.riskScore).slice(0,20).map((x:any)=>({
    escalationId:x.escalationId,title:x.title,reason:x.reason,sourceType:x.sourceType,sourceReference:x.sourceReference,
    priority:x.priority,status:x.status,dueDate:x.dueDate,ageDays:x.ageDays,isOverdue:x.isOverdue,riskScore:x.riskScore
   })),
   warnings,
  };
 }
 private previousMonth(month:string){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-2,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
 private validateMonth(month:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new BadRequestException('Month values must use YYYY-MM format');}
}
