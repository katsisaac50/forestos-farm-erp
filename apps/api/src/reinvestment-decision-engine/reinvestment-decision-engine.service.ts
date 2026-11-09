import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashPosition, CashflowPlan, CapitalDecision } from '../cashflow/cashflow.schema';
import { FinancialEscalation } from '../financial-escalations/financial-escalations.schema';

@Injectable()
export class ReinvestmentDecisionEngineService {
 constructor(
  @InjectModel(CashPosition.name) private positions:Model<CashPosition>,
  @InjectModel(CashflowPlan.name) private plans:Model<CashflowPlan>,
  @InjectModel(CapitalDecision.name) private decisions:Model<CapitalDecision>,
  @InjectModel(FinancialEscalation.name) private escalations:Model<FinancialEscalation>,
 ) {}
 async report(){
  const [positionRows,plans,decisions,escalations]=await Promise.all([
   this.positions.find().sort({asOfDate:-1,createdAt:-1}).limit(1).lean(),
   this.plans.find().sort({periodStart:1}).limit(1000).lean(),
   this.decisions.find().sort({decisionDate:-1}).limit(1000).lean(),
   this.escalations.find({status:{$ne:'Resolved'}}).sort({createdAt:-1}).limit(1000).lean(),
  ]);
  const position:any=positionRows[0]||null;
  const now=new Date().toISOString().slice(0,10);
  const activePlans=(plans as any[]).filter(p=>!['cancelled','completed'].includes(p.status)&&(!p.periodEnd||p.periodEnd>=now));
  const sum=(category:string)=>activePlans.filter(p=>p.category===category).reduce((s,p)=>s+Math.max(0,Number(p.plannedAmountUgx)||0),0);
  const plannedInflow=sum('inflow'),plannedOutflow=sum('outflow'),plannedReserve=sum('reserve'),plannedInvestment=sum('investment');
  const openCommitments=(decisions as any[]).filter(d=>['approved','executed'].includes(d.status)).reduce((s,d)=>s+Math.max(0,Number(d.proposedAmountUgx)||0),0);
  const protectedReserve=plannedReserve;
  const currentCash=position?Math.max(0,Number(position.openingCashUgx)||0):null;
  const projectedBeforeInvestment=currentCash===null?null:currentCash+plannedInflow-plannedOutflow-protectedReserve-openCommitments;
  const investableCash=projectedBeforeInvestment===null?null:Math.max(0,projectedBeforeInvestment-plannedInvestment);
  const critical= (escalations as any[]).filter(x=>x.priority==='Critical').length;
  const high=(escalations as any[]).filter(x=>x.priority==='High').length;
  const overdue=(escalations as any[]).filter(x=>x.dueDate&&new Date(x.dueDate)<new Date()).length;
  const reasons:string[]=[];
  if(!position) reasons.push('No cash snapshot recorded; record and reconcile cash before making a reinvestment decision.');
  if(position && currentCash===0) reasons.push('Recorded cash snapshot is zero; verify whether the snapshot is complete.');
  if(critical>0) reasons.push(`${critical} critical financial escalation(s) remain open.`);
  if(overdue>0) reasons.push(`${overdue} open financial escalation(s) are overdue.`);
  if(projectedBeforeInvestment!==null&&projectedBeforeInvestment<0) reasons.push('Planned outflows, reserves and approved/executed commitments exceed cash plus planned inflows.');
  if(plans.length>=1000||decisions.length>=1000||escalations.length>=1000) reasons.push('At least one query reached its 1,000-record limit; totals may be incomplete.');
  const hold= !position || critical>0 || overdue>0 || (projectedBeforeInvestment!==null&&projectedBeforeInvestment<=0);
  const status=hold?'HOLD / INVESTIGATE':(high>0?'REVIEW BEFORE REINVESTING':'POTENTIAL REINVESTMENT — VERIFY FIRST');
  return {
   generatedAt:new Date().toISOString(),asOfDate:position?.asOfDate||null,
   cashSnapshot:position?{amountUgx:currentCash,asOfDate:position.asOfDate,note:position.note}:null,
   totals:{plannedInflowsUgx:plannedInflow,plannedOutflowsUgx:plannedOutflow,plannedReservesUgx:protectedReserve,plannedInvestmentsUgx:plannedInvestment,approvedOrExecutedCapitalCommitmentsUgx:openCommitments,projectedBeforeInvestmentUgx:projectedBeforeInvestment,estimatedAvailableAfterPlannedInvestmentsUgx:investableCash},
   controlSignals:{openEscalations:escalations.length,criticalOpen:critical,highOpen:high,overdueOpen:overdue},
   decision:{status,reasons,maximumIndicativeReinvestmentUgx:hold?0:investableCash,requiresOwnerApproval:true},
   recommendations:[
    'Reconcile the cash snapshot against bank statements, physical cash, outstanding payments and transfers.',
    'Keep reserves for unavoidable operating costs and documented commitments before considering investment.',
    'Resolve critical and overdue financial controls, or document why a controlled exception is acceptable.',
    'Use a written business case with costs, risks, cash timing and evidence before approving any spend.',
   ],
   assumptions:[
    'The latest cash snapshot is treated as the starting point; it is not a live bank balance.',
    'Planned inflows are not guaranteed income. Consider removing uncertain inflows before deciding.',
    'Planned reserves and active planned investments are deducted; approved/executed capital decisions are treated as commitments.',
    'This tool is decision support only. It does not approve payments, transfer money or replace owner judgement.',
   ],
   warnings:reasons,
  };
 }
}
