import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlertState } from '../alert-center/alert.schema';
import { FinanceTransaction } from '../finance/finance.schema';
import { CashPosition, CashflowPlan } from '../cashflow/cashflow.schema';
import { StockItem } from '../inventory-control/inventory.schema';
import { LabourTask } from '../workforce/workforce.schema';
import { WorkflowEvent } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceUpdate } from '../performance-strategy/performance.schema';
import { FarmRisk, RiskAction } from '../risk-management/risk.schema';
import { MaintenanceRecord } from '../maintenance/maintenance.schema';

@Injectable()
export class CommandCentreService {
 constructor(
  @InjectModel(AlertState.name) private alerts:Model<any>,
  @InjectModel(FinanceTransaction.name) private finance:Model<any>,
  @InjectModel(CashPosition.name) private cashPositions:Model<any>,
  @InjectModel(CashflowPlan.name) private cashPlans:Model<any>,
  @InjectModel(StockItem.name) private stock:Model<any>,
  @InjectModel(LabourTask.name) private tasks:Model<any>,
  @InjectModel(WorkflowEvent.name) private workflows:Model<any>,
  @InjectModel(PerformanceTarget.name) private targets:Model<any>,
  @InjectModel(PerformanceUpdate.name) private updates:Model<any>,
  @InjectModel(FarmRisk.name) private risks:Model<any>,
  @InjectModel(RiskAction.name) private riskActions:Model<any>,
  @InjectModel(MaintenanceRecord.name) private maintenance:Model<any>,
 ){}
 private today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 async dashboard(){
  const today=this.today(), now=new Date(), monthStart=`${today.slice(0,7)}-01`;
  const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1);
  const [alerts,stock,tasks,failedWorkflows,pendingWorkflows,targets,updates,risks,riskActions,maintenance,cashPosition,cashPlans,income,expenses]=await Promise.all([
   this.alerts.find({state:{$ne:'resolved'}}).sort({severity:-1,lastSeenAt:-1}).limit(100).lean(),
   this.stock.find().select('itemCode name quantityOnHand reorderLevel averageUnitCostUgx').limit(10000).lean(),
   this.tasks.find().select('taskCode title plannedDate status priority assignedWorkerCode').limit(10000).lean(),
   this.workflows.countDocuments({status:'failed'}),
   this.workflows.countDocuments({status:'pending'}),
   this.targets.find({status:'active'}).select('targetCode title periodStart periodEnd status').limit(1000).lean(),
   this.updates.find().sort({updateDate:-1,createdAt:-1}).limit(5000).lean(),
   this.risks.find({status:{$ne:'closed'}}).select('riskCode title likelihood impact residualLikelihood residualImpact status reviewDate dueDate').limit(1000).lean(),
   this.riskActions.find({status:{$in:['open','in_progress','blocked']}}).select('title actionOwner dueDate status riskId').limit(1000).lean(),
   this.maintenance.find({status:{$in:['planned','in_progress']}}).select('maintenanceCode title plannedDate status assignedTo').limit(1000).lean(),
   this.cashPositions.findOne().sort({asOfDate:-1,createdAt:-1}).lean(),
   this.cashPlans.find({status:{$in:['planned','committed']},periodEnd:{$gte:today}}).sort({periodStart:1}).limit(1000).lean(),
   this.finance.find({direction:'Income',date:{$gte:new Date(`${monthStart}T00:00:00.000Z`),$lt:nextMonth}}).select('amountUgx').limit(10000).lean(),
   this.finance.find({direction:'Expense',date:{$gte:new Date(`${monthStart}T00:00:00.000Z`),$lt:nextMonth}}).select('amountUgx').limit(10000).lean(),
  ]);
  const latestById=new Map<string,any>();for(const u of updates){const id=String(u.targetId);if(!latestById.has(id))latestById.set(id,u);}
  const actions:any[]=[];
  for(const a of alerts) actions.push({id:`alert:${a._id}`,priority:a.severity==='critical'?1:a.severity==='high'?2:3,severity:a.severity,title:a.title,detail:a.detail,sourcePath:a.sourcePath,reason:'Persisted unresolved alert',dueDate:null});
  for(const t of tasks){if(String(t.plannedDate||'')<today&&!['verified','cancelled'].includes(t.status))actions.push({id:`task:${t._id}`,priority:['urgent','high'].includes(t.priority)?1:3,severity:['urgent','high'].includes(t.priority)?'high':'medium',title:`Overdue task: ${t.title}`,detail:`${t.taskCode} planned ${t.plannedDate}; status ${t.status}${t.assignedWorkerCode?`; assigned to ${t.assignedWorkerCode}`:''}.`,sourcePath:'/workforce',reason:'Task date has passed',dueDate:t.plannedDate});}
  for(const x of stock){if(Number(x.quantityOnHand||0)<=Number(x.reorderLevel||0))actions.push({id:`stock:${x._id}`,priority:Number(x.quantityOnHand||0)===0?1:3,severity:Number(x.quantityOnHand||0)===0?'high':'medium',title:`Stock check: ${x.name}`,detail:`${x.itemCode}: ${x.quantityOnHand||0} on hand; reorder level ${x.reorderLevel||0}. Physically verify before purchasing.`,sourcePath:'/inventory-control',reason:'At or below reorder level',dueDate:null});}
  for(const w of maintenance){if(String(w.plannedDate||'')<=today)actions.push({id:`maintenance:${w._id}`,priority:2,severity:'medium',title:`Maintenance due: ${w.title}`,detail:`${w.maintenanceCode} planned ${w.plannedDate}; status ${w.status}.`,sourcePath:'/maintenance',reason:'Planned maintenance date reached',dueDate:w.plannedDate});}
  for(const r of risks){const score=Number(r.residualLikelihood||r.likelihood||1)*Number(r.residualImpact||r.impact||1);const overdue=!!r.reviewDate&&String(r.reviewDate)<today;if(score>=15||overdue)actions.push({id:`risk:${r._id}`,priority:score>=20?1:2,severity:score>=20?'critical':score>=15?'high':'medium',title:`Risk review: ${r.title}`,detail:`${r.riskCode}; score ${score}; status ${r.status}${overdue?`; review overdue since ${r.reviewDate}`:''}.`,sourcePath:'/risk-management',reason:'Elevated score or overdue review',dueDate:r.reviewDate||null});}
  for(const a of riskActions){if((a.dueDate&&String(a.dueDate)<today)||a.status==='blocked')actions.push({id:`risk-action:${a._id}`,priority:a.status==='blocked'?1:2,severity:a.status==='blocked'?'high':'medium',title:`Risk action: ${a.title}`,detail:`Status ${a.status}; owner ${a.actionOwner||'unassigned'}${a.dueDate?`; due ${a.dueDate}`:''}.`,sourcePath:'/risk-management',reason:a.status==='blocked'?'Action blocked':'Action overdue',dueDate:a.dueDate||null});}
  for(const t of targets){const latest=latestById.get(String(t._id));if((String(t.periodEnd)<today&&!latest)||(!latest&&String(t.periodEnd)>=today&&String(t.periodStart)<=today))actions.push({id:`target:${t._id}`,priority:String(t.periodEnd)<today?2:4,severity:String(t.periodEnd)<today?'high':'low',title:`KPI review: ${t.title}`,detail:`${t.targetCode}: ${latest?`last actual on ${latest.updateDate}`:'no actual update recorded'}; period ${t.periodStart} to ${t.periodEnd}.`,sourcePath:'/performance-strategy',reason:'Target needs a current actual or close-out',dueDate:t.periodEnd});}
  actions.sort((a,b)=>a.priority-b.priority||String(a.dueDate||'9999-99-99').localeCompare(String(b.dueDate||'9999-99-99'))||a.title.localeCompare(b.title));
  const lowStock=stock.filter((x:any)=>Number(x.quantityOnHand||0)<=Number(x.reorderLevel||0));
  const incomeTotal=income.reduce((s:number,x:any)=>s+Number(x.amountUgx||0),0),expenseTotal=expenses.reduce((s:number,x:any)=>s+Number(x.amountUgx||0),0);
  const committedPlans=cashPlans.reduce((s:number,x:any)=>s+(['committed','planned'].includes(x.status)&&['outflow','investment','reserve'].includes(x.category)?Number(x.plannedAmountUgx||0):0),0);
  const activeRisks=risks.length;
  return {
   generatedAt:now.toISOString(),today,
   indicators:{
    unresolvedAlerts:alerts.length,criticalAlerts:alerts.filter((a:any)=>a.severity==='critical').length,highAlerts:alerts.filter((a:any)=>a.severity==='high').length,
    overdueTasks:tasks.filter((t:any)=>String(t.plannedDate||'')<today&&!['verified','cancelled'].includes(t.status)).length,
    lowStockItems:lowStock.length,zeroStockItems:lowStock.filter((x:any)=>Number(x.quantityOnHand||0)===0).length,
    failedWorkflows:failedWorkflows,pendingWorkflows:pendingWorkflows,activeRisks,
    tasksToReview:actions.length,recordedIncomeThisMonthUgx:Math.round(incomeTotal),recordedExpensesThisMonthUgx:Math.round(expenseTotal),recordedNetThisMonthUgx:Math.round(incomeTotal-expenseTotal),
    latestCashSnapshot: (() => {
  const cp = Array.isArray(cashPosition) ? cashPosition[0] : (cashPosition as any);
  return cp ? { asOfDate: cp.asOfDate, openingCashUgx: cp.openingCashUgx, note: cp.note } : null;
})(),
    upcomingPlannedOrCommittedOutflowUgx:Math.round(committedPlans)
   },
   cashCaveat:'Finance totals are recorded transactions only. The latest cash snapshot is a manually recorded opening/position figure, not a live bank balance. Planned/committed outflows are not proof of payment.',
   actionList:actions.slice(0,100),
   modules:{stockItemsRead:stock.length,tasksRead:tasks.length,activeRisksRead:risks.length,maintenanceItemsRead:maintenance.length,performanceTargetsRead:targets.length,limits:'Several source lists are bounded; counts can be incomplete on very large datasets.'}
  };
 }
}
