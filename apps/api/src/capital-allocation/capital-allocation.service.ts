import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CashPosition, CashflowPlan, CapitalDecision } from '../cashflow/cashflow.schema';
import { CapitalAllocationPolicy, CapitalAllocationProposal } from './capital-allocation.schema';
import { FinancialEscalation } from '../financial-escalations/financial-escalations.schema';
@Injectable()
export class CapitalAllocationService {
 constructor(
  @InjectModel(CapitalAllocationPolicy.name) private policies:Model<CapitalAllocationPolicy>,
  @InjectModel(CapitalAllocationProposal.name) private proposals:Model<CapitalAllocationProposal>,
  @InjectModel(CashPosition.name) private positions:Model<CashPosition>,
  @InjectModel(CashflowPlan.name) private plans:Model<CashflowPlan>,
  @InjectModel(CapitalDecision.name) private decisions:Model<CapitalDecision>,
  @InjectModel(FinancialEscalation.name) private escalations:Model<FinancialEscalation>,
  private audit:AuditService,
 ){}
 async dashboard(){
  const [policy,rows,positions,plans,decisions,escalations]=await Promise.all([
   this.policies.findOne({policyKey:'default'}).lean(),
   this.proposals.find().sort({createdAt:-1}).limit(500).lean(),
   this.positions.find().sort({asOfDate:-1,createdAt:-1}).limit(1).lean(),
   this.plans.find().sort({periodStart:1}).limit(1000).lean(),
   this.decisions.find().sort({decisionDate:-1}).limit(1000).lean(),
   this.escalations.find({status:{$ne:'Resolved'}}).limit(1000).lean(),
  ]);
  const p:any=policy||{minimumOperatingReserveUgx:0,eucalyptusBudgetUgx:0,beekeepingBudgetUgx:0,infrastructureBudgetUgx:0,otherBudgetUgx:0};
  const cash:any=positions[0]||null;
  const now=new Date().toISOString().slice(0,10);
  const activePlans=(plans as any[]).filter(x=>!['cancelled','completed'].includes(x.status)&&(!x.periodEnd||x.periodEnd>=now));
  const sum=(category:string)=>activePlans.filter(x=>x.category===category).reduce((s,x)=>s+Math.max(0,Number(x.plannedAmountUgx)||0),0);
  const committed=(decisions as any[]).filter(x=>['approved','executed'].includes(x.status)).reduce((s,x)=>s+Math.max(0,Number(x.proposedAmountUgx)||0),0);
  const plannedIn=sum('inflow'),plannedOut=sum('outflow'),plannedReserve=sum('reserve'),plannedInvest=sum('investment');
  const currentCash=cash?Math.max(0,Number(cash.openingCashUgx)||0):null;
  const indicative=Math.max(0,(currentCash??0)+plannedIn-plannedOut-Math.max(Number(p.minimumOperatingReserveUgx)||0,plannedReserve)-committed-plannedInvest);
  const open=(escalations as any[]);
  const approvedByLine:Record<string,number>={eucalyptus:0,beekeeping:0,infrastructure:0,other:0};
  for(const x of rows as any[]) if(['approved','executed'].includes(x.status)) approvedByLine[x.businessLine]=(approvedByLine[x.businessLine]||0)+Number(x.amountUgx||0);
  const budgetByLine:Record<string,number>={eucalyptus:Number(p.eucalyptusBudgetUgx)||0,beekeeping:Number(p.beekeepingBudgetUgx)||0,infrastructure:Number(p.infrastructureBudgetUgx)||0,other:Number(p.otherBudgetUgx)||0};
  const budgets=Object.keys(budgetByLine).map(k=>({businessLine:k,budgetUgx:budgetByLine[k],approvedOrExecutedUgx:approvedByLine[k]||0,remainingUgx:Math.max(0,budgetByLine[k]-(approvedByLine[k]||0)),overBudget:(approvedByLine[k]||0)>budgetByLine[k]}));
  return {policy:p,cashSnapshot:cash?{asOfDate:cash.asOfDate,amountUgx:currentCash,note:cash.note}:null,summary:{plannedInflowsUgx:plannedIn,plannedOutflowsUgx:plannedOut,plannedReservesUgx:plannedReserve,plannedInvestmentsUgx:plannedInvest,approvedCapitalCommitmentsUgx:committed,openEscalations:open.length,criticalEscalations:open.filter(x=>x.priority==='Critical').length,overdueEscalations:open.filter(x=>x.dueDate&&new Date(x.dueDate)<new Date()).length,indicativeUnallocatedCashUgx:cash?indicative:null},budgets,proposals:rows,warnings:[!policy?'No reserve or business-line budget policy has been saved. Configure one before using budget checks.':null,!cash?'No cash snapshot exists; capital proposals cannot be checked against recorded cash.':null,open.some(x=>x.priority==='Critical')?'Critical financial escalations remain open. Review before approving discretionary capital.':null,plans.length>=1000||decisions.length>=1000||escalations.length>=1000||rows.length>=500?'At least one source query reached its record limit; totals may be incomplete.':null].filter(Boolean)};
 }
 async savePolicy(dto:any,user:any){
  const fields=['minimumOperatingReserveUgx','eucalyptusBudgetUgx','beekeepingBudgetUgx','infrastructureBudgetUgx','otherBudgetUgx'];
  const values:any={policyKey:'default',updatedBy:user.email};
  for(const f of fields){const n=Number(dto[f]);if(!Number.isFinite(n)||n<0)throw new BadRequestException(`${f} must be a non-negative amount.`);values[f]=n;}
  const row=await this.policies.findOneAndUpdate({policyKey:'default'},{$set:values},{new:true,upsert:true,runValidators:true});
  await this.audit.record(user.email,'updated','capital_allocation_policy',String(row._id),'Updated reserve and capital allocation budgets');
  return row;
 }
 async createProposal(dto:any,user:any){
  if(!dto.proposalCode?.trim()||!dto.title?.trim()||!dto.purpose?.trim()||!dto.evidenceReference?.trim())throw new BadRequestException('Proposal code, title, purpose and evidence reference are required.');
  const amount=Number(dto.amountUgx);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Proposal amount must be greater than zero.');
  if(!['eucalyptus','beekeeping','infrastructure','other'].includes(dto.businessLine))throw new BadRequestException('Select a valid business line.');
  if(await this.proposals.findOne({proposalCode:dto.proposalCode.trim()}).lean())throw new BadRequestException('Proposal code already exists.');
  const row=await this.proposals.create({...dto,proposalCode:dto.proposalCode.trim(),amountUgx:amount,status:'proposed',createdBy:user.email});
  await this.audit.record(user.email,'created','capital_allocation_proposal',String(row._id),`Created capital proposal ${row.proposalCode}`);
  return row;
 }
 async review(id:string,dto:any,user:any){
  const row:any=await this.proposals.findById(id);if(!row)throw new NotFoundException('Capital proposal not found.');
  if(!['approved','rejected','deferred','executed'].includes(dto.status))throw new BadRequestException('Invalid review status.');
  if(!dto.reviewNote?.trim())throw new BadRequestException('A review note is required.');
  if(dto.status==='approved'||dto.status==='executed'){
   const d=await this.dashboard();
   if(!d.cashSnapshot)throw new BadRequestException('Cannot approve without a recorded cash snapshot.');
   if(d.summary.criticalEscalations>0||d.summary.overdueEscalations>0)throw new BadRequestException('Resolve or formally review critical/overdue financial escalations before approving.');
   const budget=d.budgets.find((x:any)=>x.businessLine===row.businessLine);
   if(!budget||Number(row.amountUgx)>budget.remainingUgx)throw new BadRequestException('Proposal exceeds the remaining business-line budget.');
   if(Number(row.amountUgx)>Number(d.summary.indicativeUnallocatedCashUgx||0))throw new BadRequestException('Proposal exceeds indicative unallocated cash after reserves and commitments.');
  }
  row.status=dto.status;row.reviewedBy=user.email;row.reviewNote=dto.reviewNote.trim();row.reviewedAt=new Date();await row.save();
  await this.audit.record(user.email,'updated','capital_allocation_proposal',String(row._id),`Capital proposal ${row.proposalCode} status set to ${row.status}`);
  return row;
 }
}
