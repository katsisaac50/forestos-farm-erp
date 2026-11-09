import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialEscalation } from '../financial-escalations/financial-escalations.schema';
import { FinancialAction } from '../financial-action-centre/financial-action.schema';
import { FinancialInvestigation } from '../financial-investigations/financial-investigation.schema';
import { FinancialEvidence } from '../financial-evidence/financial-evidence.schema';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';

@Injectable()
export class FinancialControlReportService {
 constructor(
  @InjectModel(FinancialEscalation.name) private readonly escalations: Model<FinancialEscalation>,
  @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
  @InjectModel(FinancialInvestigation.name) private readonly investigations: Model<FinancialInvestigation>,
  @InjectModel(FinancialEvidence.name) private readonly evidence: Model<FinancialEvidence>,
  @InjectModel(FinancialReconciliation.name) private readonly reconciliations: Model<FinancialReconciliation>,
 ) {}
 async report(requestedMonth?: string, requestedCompareTo?: string) {
  const month = requestedMonth || new Date().toISOString().slice(0,7);
  const compareTo = requestedCompareTo || this.previousMonth(month);
  this.validateMonth(month); this.validateMonth(compareTo);
  const [escalations, priorEscalations, actions, investigations, evidence, reconciliations] = await Promise.all([
   this.escalations.find({ month }).limit(1000).lean(),
   this.escalations.find({ month: compareTo }).limit(1000).lean(),
   this.actions.find({ month }).limit(1000).lean(),
   this.investigations.find({ month }).limit(1000).lean(),
   this.evidence.find({ month }).limit(1000).lean(),
   this.reconciliations.find({ month }).limit(500).lean(),
  ]);
  const active = escalations.filter((x:any)=>x.status!=='Resolved');
  const overdue = active.filter((x:any)=>x.dueDate && new Date(x.dueDate)<new Date());
  const priorActive = priorEscalations.filter((x:any)=>x.status!=='Resolved');
  const completedActions = actions.filter((x:any)=>x.status==='Completed').length;
  const actionCompletionRate = actions.length ? Math.round(completedActions/actions.length*1000)/10 : 0;
  const closedInvestigations = investigations.filter((x:any)=>['Resolved','Closed - reviewed'].includes(x.status));
  const rejectedEvidence = evidence.filter((x:any)=>['Rejected','Needs more information'].includes(x.reviewStatus));
  const unresolvedReconciliations = reconciliations.filter((x:any)=>x.status!=='Matched'||!x.reviewed);
  const priorityCounts = ['Critical','High','Medium'].map(priority=>({priority,count:active.filter((x:any)=>x.priority===priority).length}));
  const sourceCounts = ['Investigation','Corrective action','Evidence','Reconciliation'].map(sourceType=>({sourceType,count:active.filter((x:any)=>x.sourceType===sourceType).length}));
  const repeated = new Map<string,number>();
  for (const x of active as any[]) {
   const key=`${x.sourceType}|${x.reason || x.title}`.toLowerCase().replace(/\s+/g,' ').trim();
   repeated.set(key,(repeated.get(key)||0)+1);
  }
  const repeatedPatterns=[...repeated.entries()].filter(([,count])=>count>1).map(([pattern,count])=>({pattern,count})).sort((a,b)=>b.count-a.count).slice(0,20);
  const change = active.length-priorActive.length;
  const caps=[];
  if(escalations.length===1000||priorEscalations.length===1000||actions.length===1000||investigations.length===1000||evidence.length===1000||reconciliations.length===500) caps.push('At least one source query reached its record limit; metrics may be incomplete.');
  return {
   month, compareTo, generatedAt:new Date().toISOString(),
   metrics:{
    escalationCount:escalations.length, activeEscalations:active.length, overdueEscalations:overdue.length,
    resolvedEscalations:escalations.length-active.length, activeEscalationChangeVsPriorMonth:change,
    priorMonthActiveEscalations:priorActive.length,
    criticalOpen:active.filter((x:any)=>x.priority==='Critical').length,
    highOpen:active.filter((x:any)=>x.priority==='High').length,
    mediumOpen:active.filter((x:any)=>x.priority==='Medium').length,
    actionCount:actions.length, completedActions, actionCompletionRatePercent:actionCompletionRate,
    outstandingInvestigations:investigations.filter((x:any)=>!['Resolved','Closed - reviewed'].includes(x.status)).length,
    closedInvestigations:closedInvestigations.length,
    evidenceNeedingAttention:rejectedEvidence.length,
    reconciliationsNeedingAttention:unresolvedReconciliations.length,
   },
   priorityCounts, sourceCounts, repeatedPatterns,
   topOpenEscalations:active.sort((a:any,b:any)=>['Critical','High','Medium'].indexOf(a.priority)-['Critical','High','Medium'].indexOf(b.priority)).slice(0,25).map((x:any)=>({escalationId:x.escalationId,title:x.title,sourceType:x.sourceType,sourceReference:x.sourceReference,priority:x.priority,status:x.status,dueDate:x.dueDate,reason:x.reason})),
   warnings:caps,
   interpretation:[
    'This is an operational management report, not an audited financial statement.',
    'The month-over-month change compares active escalation records assigned to each month; it is not a count of new incidents created during the month.',
    'Action completion rate is completed corrective-action records divided by all corrective-action records for the selected month.',
    'Repeated patterns are based on repeated escalation reason/title text and may reflect similar legitimate issues.',
    'Only records already present in the source collections are included; this report does not itself run the escalation refresh process.',
   ]
  };
 }
 private previousMonth(month:string) {
  const [y,m]=month.split('-').map(Number);
  const d=new Date(Date.UTC(y,m-2,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
 }
 private validateMonth(month:string) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Month values must use YYYY-MM format');
 }
}
