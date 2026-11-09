import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CapitalAllocationProposal } from '../capital-allocation/capital-allocation.schema';
import { CapitalSpendRecord } from './capital-spend-verification.schema';
import { SpendEvidenceEvent } from './spend-evidence-event.schema';
@Injectable()
export class CapitalSpendVerificationService {
 constructor(
  @InjectModel(CapitalSpendRecord.name) private spends:Model<CapitalSpendRecord>,
  @InjectModel(CapitalAllocationProposal.name) private proposals:Model<CapitalAllocationProposal>,
  @InjectModel(SpendEvidenceEvent.name) private evidenceEvents:Model<SpendEvidenceEvent>,
  private audit:AuditService,
 ){}

 async reconciliationReport() {
  // Read-only, bounded scan. A truncated scan is explicitly marked partial.
  const [spendRows, proposalRows] = await Promise.all([
   this.spends.find().sort({createdAt: 1, _id: 1}).limit(1001).lean(),
   this.proposals.find().sort({createdAt: 1, _id: 1}).limit(501).lean(),
  ]);
  const spends = spendRows as any[];
  const proposals = proposalRows as any[];
  const spendsTruncated = spends.length > 1000;
  const proposalsTruncated = proposals.length > 500;
  const boundedSpends = spends.slice(0, 1000);
  const boundedProposals = proposals.slice(0, 500);
  const findings: any[] = [];
  const byId = new Map<string, any>(boundedSpends.map((s) => [String(s._id), s]));
  const runId = `recon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const asOf = new Date().toISOString();

  for (const proposal of boundedProposals) {
   const proposalId = String(proposal._id);
   const linked = boundedSpends.filter((s) => String(s.proposalId) === proposalId);
   const originals = linked.filter((s) => s.status === 'verified' && !s.correctionOfSpendId);
   const reversalRows = linked.filter((s) => Boolean(s.correctionOfSpendId));
   const grossOriginalsUgx = originals.reduce((sum, s) => sum + Math.max(0, Number(s.amountUgx) || 0), 0);
   let validReversalTotalUgx = 0;
   const proposalFindings: any[] = [];

   for (const reversal of reversalRows) {
    const original = byId.get(String(reversal.correctionOfSpendId));
    const linkIsConsistent = Boolean(
     original &&
     String(original.proposalId) === proposalId &&
     original.status === 'verified' &&
     original.correctionState === 'reversed' &&
     String(original.reversedBySpendId || '') === String(reversal._id) &&
     Number(original.amountUgx) === Number(reversal.amountUgx)
    );
    if (linkIsConsistent) {
     validReversalTotalUgx += Math.max(0, Number(reversal.amountUgx) || 0);
    } else {
     proposalFindings.push({
      code: 'REVERSAL_LINK_INCONSISTENT',
      severity: 'critical',
      spendRecordId: String(reversal._id),
      relatedSpendRecordId: reversal.correctionOfSpendId || null,
      message: 'Reversal linkage does not agree with the original record.',
     });
    }
   }

   const duplicateTargets = new Map<string, number>();
   for (const reversal of reversalRows) {
    const target = String(reversal.correctionOfSpendId || '');
    if (target) duplicateTargets.set(target, (duplicateTargets.get(target) || 0) + 1);
   }
   for (const [target, count] of duplicateTargets.entries()) {
    if (count > 1) proposalFindings.push({
     code: 'MULTIPLE_REVERSALS_FOR_ORIGINAL',
     severity: 'critical',
     spendRecordId: target,
     message: `Found ${count} reversal rows linked to one original spend.`,
    });
   }

   const netSpendUgx = grossOriginalsUgx - validReversalTotalUgx;
   const storedCounterUgx = Number(proposal.verifiedSpendUgx || 0);
   const counterVarianceUgx = storedCounterUgx - netSpendUgx;
   const approvedAmountUgx = Number(proposal.amountUgx || 0);
   if (netSpendUgx < 0) proposalFindings.push({
    code: 'NEGATIVE_NET_SPEND', severity: 'critical',
    message: 'Valid reversal total exceeds gross verified original spend.',
   });
   if (netSpendUgx > approvedAmountUgx) proposalFindings.push({
    code: 'APPROVED_AMOUNT_EXCEEDED', severity: 'critical',
    message: 'Calculated net spend exceeds the approved proposal amount.',
   });
   if (storedCounterUgx !== netSpendUgx) proposalFindings.push({
    code: 'COUNTER_VARIANCE', severity: 'high',
    message: 'Stored commitment counter differs from calculated net spend.',
   });
   for (const spend of linked) {
    if (!boundedProposals.some((p) => String(p._id) === String(spend.proposalId))) {
     proposalFindings.push({
      code: 'ORPHAN_PROPOSAL_LINK', severity: 'high',
      spendRecordId: String(spend._id),
      message: 'Spend references a proposal outside the scanned proposal set.',
     });
    }
   }
   findings.push({
    proposalId,
    proposalCode: proposal.proposalCode,
    businessLine: proposal.businessLine,
    status: proposal.status,
    approvedAmountUgx,
    grossOriginalVerifiedSpendUgx: grossOriginalsUgx,
    validReversalTotalUgx,
    netSpendUgx,
    remainingApprovedAmountUgx: approvedAmountUgx - netSpendUgx,
    storedCommitmentCounterUgx: storedCounterUgx,
    counterVarianceUgx,
    findings: proposalFindings,
   });
  }

  // Catch spend rows that reference a proposal not present in the bounded proposal set.
  const proposalIds = new Set(boundedProposals.map((p) => String(p._id)));
  for (const spend of boundedSpends) {
   if (!proposalIds.has(String(spend.proposalId))) {
    findings.push({
     proposalId: String(spend.proposalId),
     proposalCode: spend.proposalCode || null,
     approvedAmountUgx: null,
     grossOriginalVerifiedSpendUgx: spend.status === 'verified' && !spend.correctionOfSpendId ? Number(spend.amountUgx || 0) : 0,
     validReversalTotalUgx: 0,
     netSpendUgx: null,
     remainingApprovedAmountUgx: null,
     storedCommitmentCounterUgx: null,
     counterVarianceUgx: null,
     findings: [{
      code: 'ORPHAN_PROPOSAL_LINK',
      severity: 'high',
      spendRecordId: String(spend._id),
      message: 'Spend references a proposal that was not found in the bounded proposal scan.',
     }],
    });
   }
  }

  const isPartial = spendsTruncated || proposalsTruncated;
  return {
   runId,
   asOf,
   readOnly: true,
   isPartial,
   scanLimits: { spendRecords: 1000, proposals: 500 },
   scanned: { spendRecords: Math.min(boundedSpends.length, 1000), proposals: Math.min(boundedProposals.length, 500) },
   warning: isPartial ? 'Source scan exceeded a configured limit; findings are partial and must not be treated as a full reconciliation.' : null,
   totals: {
    proposalCount: findings.length,
    criticalFindingCount: findings.reduce((n, p) => n + p.findings.filter((f: any) => f.severity === 'critical').length, 0),
    highFindingCount: findings.reduce((n, p) => n + p.findings.filter((f: any) => f.severity === 'high').length, 0),
   },
   proposals: findings,
  };
 }

 async dashboard(){
  const [spends,proposals]=await Promise.all([
   this.spends.find().sort({spendDate:-1,createdAt:-1}).limit(1000).lean(),
   this.proposals.find().sort({createdAt:-1}).limit(500).lean(),
  ]);
  const rows=proposals as any[], entries=spends as any[];
  const verified=entries.filter(x=>x.status==='verified');
  const summaries=rows.filter(p=>['approved','executed'].includes(p.status)).map(p=>{
   const approvedSpend=verified.filter(s=>String(s.proposalId)===String(p._id));
   const verifiedUgx=approvedSpend.reduce((n,s)=>n+Number(s.amountUgx||0),0);
   const pendingUgx=entries.filter(s=>String(s.proposalId)===String(p._id)&&s.status==='submitted').reduce((n,s)=>n+Number(s.amountUgx||0),0);
   return {proposalId:String(p._id),proposalCode:p.proposalCode,title:p.title,businessLine:p.businessLine,approvedAmountUgx:Number(p.amountUgx||0),verifiedSpendUgx:verifiedUgx,pendingVerificationUgx:pendingUgx,remainingAgainstApprovalUgx:Number(p.amountUgx||0)-verifiedUgx,overrun:verifiedUgx>Number(p.amountUgx||0)};
  });
  return {generatedAt:new Date().toISOString(),spends:entries,proposals:rows.filter(p=>['approved','executed'].includes(p.status)).map(p=>({_id:String(p._id),proposalCode:p.proposalCode,title:p.title,businessLine:p.businessLine,amountUgx:p.amountUgx,status:p.status})),summaries,warnings:[spends.length>=1000||proposals.length>=500?'At least one query reached its record limit; totals may be incomplete.':null,'Only verified spend entries count as actual spend. Submitted entries remain unverified and should not be treated as confirmed expenditure.','This register records evidence and does not move money or connect to a bank.'].filter(Boolean)};
 }
 async create(dto:any,user:any){
  if(!dto.spendCode?.trim()||!dto.proposalId||!dto.spendDate||!dto.supplierOrRecipient?.trim()||!dto.evidenceReference?.trim())throw new BadRequestException('Spend code, approved proposal, date, supplier/recipient and evidence reference are required.');
  const amount=Number(dto.amountUgx);if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Spend amount must be greater than zero.');
  const proposal:any=await this.proposals.findById(dto.proposalId).lean();
  if(!proposal)throw new NotFoundException('Linked capital proposal not found.');
  if(!['approved','executed'].includes(proposal.status))throw new BadRequestException('Spend records can only link to an approved or executed capital proposal.');
  if(await this.spends.findOne({spendCode:dto.spendCode.trim()}).lean())throw new BadRequestException('Spend code already exists.');
  const row=await this.spends.create({spendCode:dto.spendCode.trim(),proposalId:String(proposal._id),proposalCode:proposal.proposalCode,businessLine:proposal.businessLine,amountUgx:amount,spendDate:dto.spendDate,supplierOrRecipient:dto.supplierOrRecipient.trim(),evidenceReference:dto.evidenceReference.trim(),status:'submitted',recordedBy:user.email});
  await this.audit.record(user.email,'created','capital_spend_record',String(row._id),`Submitted spend evidence ${row.spendCode} for ${row.proposalCode}`);
  return row;
 }
 async review(id:string,dto:any,user:any){
  const row:any=await this.spends.findById(id);
  if(!row)throw new NotFoundException('Spend record not found.');
  if(!['verified','rejected'].includes(dto.status))throw new BadRequestException('Spend review status must be verified or rejected.');
  if(!dto.reviewNote?.trim())throw new BadRequestException('Review note is required.');
  if(row.status!=='submitted')throw new ConflictException('Only submitted spend records can be reviewed. Create a correction/reversal workflow for a previously reviewed record.');
  if(dto.status==='verified'){
   const proposal:any=await this.proposals.findById(row.proposalId).lean();
   if(!proposal)throw new NotFoundException('Linked capital proposal not found.');
   if(!['approved','executed'].includes(proposal.status))throw new BadRequestException('Linked proposal is no longer approved or executed.');

   // Backfill the counter once for older proposal documents. Conditional update means concurrent
   // first-time initialisers race safely: only one can set a missing counter.
   const priorRows:any[]=await this.spends.find({proposalId:row.proposalId,status:'verified'}).select({amountUgx:1}).lean();
   const legacyTotal=priorRows.reduce((n,s)=>n+Number(s.amountUgx||0),0);
   await this.proposals.updateOne(
    {_id:proposal._id,verifiedSpendUgx:{$exists:false}},
    {$set:{verifiedSpendUgx:legacyTotal}},
   );

   // Atomic conditional increment: MongoDB evaluates the remaining-commitment predicate and
   // increments the counter in one document update, so concurrent verifications cannot both
   // spend the same remaining amount.
   const reserved:any=await this.proposals.findOneAndUpdate(
    {_id:proposal._id,$expr:{$lte:[{$add:[{$ifNull:['$verifiedSpendUgx',0]},Number(row.amountUgx)]},'$amountUgx']}},
    {$inc:{verifiedSpendUgx:Number(row.amountUgx)}},
    {new:true},
   ).lean();
   if(!reserved)throw new BadRequestException('Verification would exceed the approved proposal amount. No spend was verified; review the evidence and proposal.');
  }
  row.status=dto.status;row.reviewedBy=user.email;row.reviewNote=dto.reviewNote.trim();row.reviewedAt=new Date();await row.save();
  await this.audit.record(user.email,'updated','capital_spend_record',String(row._id),`Spend record ${row.spendCode} marked ${row.status}`);
  return row;
 }

 async addEvidenceReference(id:string,dto:any,user:any){
  const row:any=await this.spends.findById(id);
  if(!row)throw new NotFoundException('Spend record not found.');
  const next=String(dto.evidenceReference||'').trim();
  const reason=String(dto.reason||'').trim();
  if(next.length<3||next.length>500)throw new BadRequestException('Evidence reference must be between 3 and 500 characters.');
  if(reason.length<8||reason.length>1000)throw new BadRequestException('Explain why the evidence reference is being added or corrected (8–1000 characters).');
  const previous=String(row.evidenceReference||'');
  if(previous===next)throw new BadRequestException('New evidence reference is identical to the current reference.');
  // Keep prior references in the append-only event collection; do not erase history.
  await this.evidenceEvents.create({spendRecordId:String(row._id),eventType:'evidence_reference_added',actor:user.email,reason,previousValue:previous,newValue:next,isFinancialReversal:false});
  row.evidenceReference=next;
  if(row.status==='verified'){
   row.correctionState='correction_requested';
   row.correctionReason=`Evidence reference changed after verification: ${reason}`;
  }
  await row.save();
  await this.audit.record(user.email,'updated','capital_spend_evidence',String(row._id),`Updated evidence reference for ${row.spendCode}; prior reference retained in evidence event history`);
  return row;
 }

 async requestCorrection(id:string,dto:any,user:any){
  const row:any=await this.spends.findById(id);
  if(!row)throw new NotFoundException('Spend record not found.');
  if(row.status!=='verified')throw new BadRequestException('Correction requests are only for verified spend records.');
  const reason=String(dto.reason||'').trim();
  if(reason.length<8||reason.length>1000)throw new BadRequestException('Correction reason must be between 8 and 1000 characters.');
  if(row.correctionState==='correction_requested')throw new ConflictException('A correction is already pending for this spend record.');
  row.correctionState='correction_requested';row.correctionReason=reason;await row.save();
  await this.evidenceEvents.create({spendRecordId:String(row._id),eventType:'correction_requested',actor:user.email,reason,previousValue:JSON.stringify({amountUgx:row.amountUgx,status:row.status}),isFinancialReversal:false});
  await this.audit.record(user.email,'created','capital_spend_correction_request',String(row._id),`Correction requested for verified spend ${row.spendCode}`);
  return row;
 }

 async createReversal(id:string,dto:any,user:any){
  const original:any=await this.spends.findById(id);
  if(!original)throw new NotFoundException('Original spend record not found.');
  if(original.status!=='verified')throw new BadRequestException('Only verified spend records can be reversed.');
  if(original.reversedBySpendId)throw new ConflictException('This spend record has already been reversed.');
  const reason=String(dto.reason||'').trim();
  const reversalCode=String(dto.reversalCode||'').trim();
  const evidenceReference=String(dto.evidenceReference||'').trim();
  const spendDate=String(dto.spendDate||'').trim();
  if(reason.length<8||reason.length>1000)throw new BadRequestException('Reversal reason must be between 8 and 1000 characters.');
  if(!reversalCode||reversalCode.length>100||!evidenceReference||evidenceReference.length>500)throw new BadRequestException('A unique reversal code and evidence reference are required.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(spendDate)||new Date(`${spendDate}T00:00:00.000Z`).toISOString?.().slice(0,10)!==spendDate)throw new BadRequestException('Reversal date must be a real YYYY-MM-DD date.');
  if(await this.spends.findOne({spendCode:reversalCode}).lean())throw new ConflictException('Reversal code already exists.');
  const proposal:any=await this.proposals.findById(original.proposalId);
  if(!proposal)throw new NotFoundException('Linked capital proposal not found.');
  // A reversal is a separate, traceable record. It does not mutate the original verified row.
  // Counter decrement is conditional and cannot make the counter negative.
  const decremented:any=await this.proposals.findOneAndUpdate(
   {_id:proposal._id,verifiedSpendUgx:{$gte:Number(original.amountUgx)}},
   {$inc:{verifiedSpendUgx:-Number(original.amountUgx)}},
   {new:true},
  ).lean();
  if(!decremented)throw new ConflictException('Verified spend counter is missing or inconsistent. Reconcile the counter before recording this reversal.');
  let reversal:any;
  try {
   reversal=await this.spends.create({spendCode:reversalCode,proposalId:String(proposal._id),proposalCode:original.proposalCode,businessLine:original.businessLine,amountUgx:Number(original.amountUgx),spendDate,supplierOrRecipient:`REVERSAL: ${original.supplierOrRecipient}`,evidenceReference,status:'rejected',recordedBy:user.email,reviewedBy:user.email,reviewNote:`Reversal of ${original.spendCode}: ${reason}`,reviewedAt:new Date(),correctionState:'reversed',correctionOfSpendId:String(original._id),correctionReason:reason});
   original.reversedBySpendId=String(reversal._id);original.correctionState='reversed';original.correctionReason=reason;await original.save();
   await this.evidenceEvents.create({spendRecordId:String(original._id),eventType:'reversal_recorded',actor:user.email,reason,previousValue:JSON.stringify({status:original.status,amountUgx:original.amountUgx}),newValue:JSON.stringify({reversalCode,amountUgx:original.amountUgx}),relatedSpendRecordId:String(reversal._id),isFinancialReversal:true});
   await this.audit.record(user.email,'created','capital_spend_reversal',String(reversal._id),`Recorded reversal ${reversalCode} for verified spend ${original.spendCode}`);
   return {original:original.toObject(),reversal:reversal.toObject(),warning:'Counter update and record creation are separate operations; reconcile if an error occurs during this workflow.'};
  } catch (error) {
   // Attempt to restore counter if the separate record creation/save failed.
   await this.proposals.updateOne({_id:proposal._id},{$inc:{verifiedSpendUgx:Number(original.amountUgx)}});
   throw error;
  }
 }

}
