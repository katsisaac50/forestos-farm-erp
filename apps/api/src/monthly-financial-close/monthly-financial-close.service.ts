import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { FinancialReconciliation } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinancialEscalation } from '../financial-escalations/financial-escalations.schema';
import { CapitalSpendRecord } from '../capital-spend-verification/capital-spend-verification.schema';
import { MonthlyFinancialClose } from './monthly-financial-close.schema';
import { MonthlyCloseVersion } from './monthly-close-version.schema';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CHECKS = [
  'incomeExpenseReviewed', 'receiptsAndEvidenceReviewed', 'cashCountCompleted',
  'bankAndMobileMoneyChecked', 'capitalSpendReviewed', 'openIssuesAssigned',
  'backupConfirmed', 'managementReviewCompleted',
] as const;

@Injectable()
export class MonthlyFinancialCloseService {
  constructor(
    @InjectModel(MonthlyFinancialClose.name) private closes: Model<MonthlyFinancialClose>,
    @InjectModel(MonthlyCloseVersion.name) private versions: Model<MonthlyCloseVersion>,
    @InjectModel(FinancialReconciliation.name) private reconciliations: Model<FinancialReconciliation>,
    @InjectModel(FinancialEscalation.name) private escalations: Model<FinancialEscalation>,
    @InjectModel(CapitalSpendRecord.name) private spends: Model<CapitalSpendRecord>,
    private audit: AuditService,
  ) {}


  private fingerprintSnapshot(data: any): string {
    const stable = (value: any): any => {
      if (Array.isArray(value)) return value.map(stable);
      if (value && typeof value === 'object') {
        const result: any = {};
        for (const key of Object.keys(value).sort()) {
          if (key === '__v' || key === 'updatedAt' || key === 'createdAt') continue;
          result[key] = stable(value[key]);
        }
        return result;
      }
      return value instanceof Date ? value.toISOString() : value;
    };
    return createHash('sha256').update(JSON.stringify(stable(data))).digest('hex');
  }

  private async appendVersion(record: any, actor: string, eventType: string, reason?: string) {
    await this.versions.create({
      closeId: String(record._id), month: record.month, eventType, actor,
      versionNumber: Number(record.closeVersion || 1),
      snapshot: {
        status: record.status, closeVersion: Number(record.closeVersion || 1),
        cashCountUgx: record.cashCountUgx, bankStatementBalanceUgx: record.bankStatementBalanceUgx,
        mobileMoneyBalanceUgx: record.mobileMoneyBalanceUgx, otherAccountBalanceUgx: record.otherAccountBalanceUgx,
        checklist: record.checklist, preparerNote: record.preparerNote,
        varianceExplanation: record.varianceExplanation, preparedBy: record.preparedBy,
        reviewedBy: record.reviewedBy, reviewerNote: record.reviewerNote,
        closedAt: record.closedAt, reopenedAt: record.reopenedAt, reopenReason: record.reopenReason,
        sourceSummary: record.sourceSummary, sourceFingerprint: record.sourceFingerprint,
        sourceChangedAfterClose: record.sourceChangedAfterClose,
      },
      reason, sourceFingerprint: record.sourceFingerprint,
    });
  }

  private validateMonth(month: string) {
    if (!month || !MONTH_RE.test(month)) throw new BadRequestException('month must use YYYY-MM format');
  }

  async dashboard(month?: string) {
    const selected = month || new Date().toISOString().slice(0, 7);
    this.validateMonth(selected);
    const [close, reconciliations, openEscalations, verifiedSpend, pendingSpend] = await Promise.all([
      this.closes.findOne({ month: selected }).lean(),
      this.reconciliations.find({ month: selected }).sort({ accountName: 1 }).limit(300).lean(),
      this.escalations.find({ month: selected, status: { $ne: 'Resolved' } }).sort({ priority: 1 }).limit(300).lean(),
      this.spends.find({ spendDate: { $regex: '^' + selected }, status: 'verified' }).limit(1000).lean(),
      this.spends.find({ spendDate: { $regex: '^' + selected }, status: 'submitted' }).limit(1000).lean(),
    ]);
    const total = (rows: any[]) => rows.reduce((sum, row) => sum + (Number(row.amountUgx) || 0), 0);
    const sourceFingerprint = this.fingerprintSnapshot({
      reconciliations, openEscalations,
      verifiedSpend: (verifiedSpend as any[]).map((x:any)=>({_id:String(x._id),amountUgx:x.amountUgx,status:x.status,evidenceReference:x.evidenceReference,spendDate:x.spendDate,proposalId:x.proposalId,correctionState:x.correctionState,reversedBySpendId:x.reversedBySpendId})),
      pendingSpend: (pendingSpend as any[]).map((x:any)=>({_id:String(x._id),amountUgx:x.amountUgx,status:x.status,evidenceReference:x.evidenceReference,spendDate:x.spendDate,proposalId:x.proposalId})),
    });
    let sourceChangedAfterClose = Boolean(close?.sourceChangedAfterClose);
    if (close?.status === 'closed' && close.sourceFingerprint && close.sourceFingerprint !== sourceFingerprint && !sourceChangedAfterClose) {
      sourceChangedAfterClose = true;
      await this.closes.updateOne({_id: close._id, status:'closed', sourceChangedAfterClose:{$ne:true}}, {$set:{sourceChangedAfterClose:true,sourceChangedDetectedAt:new Date()}});
      await this.versions.create({closeId:String(close._id),month:selected,eventType:'source_changed',actor:'system',versionNumber:Number(close.closeVersion||1),snapshot:{status:'closed',sourceChangedAfterClose:true,previousFingerprint:close.sourceFingerprint,currentFingerprint:sourceFingerprint},reason:'Current bounded source snapshot differs from the fingerprint captured at close.',sourceFingerprint});
      await this.audit.record('system','monthly_financial_period_source_changed','monthly_financial_close',String(close._id),`Financial source records changed after period ${selected} was closed`,{month:selected});
    }
    return {
      month: selected,
      generatedAt: new Date().toISOString(),
      close: close ? {...close, sourceFingerprintCurrent: sourceFingerprint, sourceChangedAfterClose} : null,
      sourceFingerprintCurrent: sourceFingerprint,
      reconciliations,
      openEscalations,
      verifiedCapitalSpendUgx: total(verifiedSpend as any[]),
      pendingCapitalSpendUgx: total(pendingSpend as any[]),
      controlSummary: {
        reconciliationCount: reconciliations.length,
        reviewedReconciliations: reconciliations.filter((r: any) => r.reviewed).length,
        unresolvedReconciliations: reconciliations.filter((r: any) => r.status !== 'Matched' || !r.reviewed).length,
        openEscalationCount: openEscalations.length,
        criticalOpenEscalationCount: openEscalations.filter((e: any) => e.priority === 'Critical').length,
        pendingSpendRecordCount: pendingSpend.length,
      },
      requiredChecklist: CHECKS,
      warnings: [
        'This is a management checklist and recorded-data snapshot, not a statutory accounting statement.',
        'Account balances are manually entered by the preparer and are not fetched from banks or mobile-money providers.',
        'A close does not certify that all transactions were recorded; completeness depends on source records and evidence.',
        'Financial records are bounded to the latest 300 reconciliations/escalations and 1,000 spend records per status.',
      ],
    };
  }

  async saveDraft(body: any, actor: string) {
    this.validateMonth(String(body.month || ''));
    const amountFields = ['cashCountUgx', 'bankStatementBalanceUgx', 'mobileMoneyBalanceUgx', 'otherAccountBalanceUgx'];
    for (const field of amountFields) {
      const n = Number(body[field]);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new BadRequestException(`${field} must be a non-negative whole UGX amount`);
    }
    if (!String(body.preparerNote || '').trim()) throw new BadRequestException('preparerNote is required');
    const allowedKeys = new Set<string>(CHECKS);
    if (!body.checklist || typeof body.checklist !== 'object' || Array.isArray(body.checklist)) {
      throw new BadRequestException('checklist must be an object of boolean values');
    }
    for (const [key, value] of Object.entries(body.checklist)) {
      if (!allowedKeys.has(key)) throw new BadRequestException(`Unsupported checklist item: ${key}`);
      if (typeof value !== 'boolean') throw new BadRequestException(`Checklist item ${key} must be true or false`);
    }
    const checklist: Record<string, boolean> = {};
    for (const key of CHECKS) checklist[key] = body.checklist[key] === true;
    const existing = await this.closes.findOne({ month: body.month });
    if (existing?.status === 'closed') throw new ConflictException('This month is closed. Reopen it with a reason before editing.');
    const source = await this.dashboard(body.month);
    const payload: any = {
      month: body.month,
      status: CHECKS.every(k => checklist[k]) ? 'ready_for_review' : 'draft',
      cashCountUgx: Number(body.cashCountUgx),
      bankStatementBalanceUgx: Number(body.bankStatementBalanceUgx),
      mobileMoneyBalanceUgx: Number(body.mobileMoneyBalanceUgx),
      otherAccountBalanceUgx: Number(body.otherAccountBalanceUgx),
      checklist,
      preparerNote: String(body.preparerNote).trim(),
      varianceExplanation: String(body.varianceExplanation || '').trim(),
      preparedBy: actor,
      sourceSummary: source.controlSummary,
      sourceFingerprint: source.sourceFingerprintCurrent,
      sourceChangedAfterClose: false,
    };
    let record: any;
    if (existing) {
      existing.closeVersion = Number(existing.closeVersion || 1) + 1;
      Object.assign(existing, payload);
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      existing.reviewerNote = undefined;
      record = await existing.save();
    } else {
      record = await this.closes.create(payload);
    }
    await this.appendVersion(record, actor, 'draft_saved', String(body.preparerNote).trim());
    await this.audit.record(actor, 'monthly_financial_close_draft_saved', 'monthly_financial_close', String(record._id), `Saved close checklist for ${body.month}`, { month: body.month, status: payload.status });
    return record.toObject ? record.toObject() : record;
  }

  async review(id: string, body: any, actor: string) {
    const record: any = await this.closes.findById(id);
    if (!record) throw new NotFoundException('Monthly close record not found');
    if (record.status === 'closed') throw new ConflictException('This month is already closed; reopen with a reason before changing it.');
    if (!String(body.reviewerNote || '').trim()) throw new BadRequestException('reviewerNote is required');
    const missing = CHECKS.filter(k => record.checklist?.[k] !== true);
    if (missing.length) throw new BadRequestException(`Complete required checklist items before closing: ${missing.join(', ')}`);
    const [reconciliations, openEscalations] = await Promise.all([
      this.reconciliations.find({ month: record.month }).limit(300).lean(),
      this.escalations.find({ month: record.month, status: { $ne: 'Resolved' } }).limit(300).lean(),
    ]);
    const unresolved = reconciliations.filter((r: any) => r.status !== 'Matched' || !r.reviewed);
    const critical = openEscalations.filter((e: any) => e.priority === 'Critical');
    if ((unresolved.length || critical.length) && !String(body.exceptionDisposition || '').trim()) {
      throw new BadRequestException('There are unresolved reconciliation items or critical escalations. Record exceptionDisposition to document why the month may be closed with these issues outstanding.');
    }
    const latestSource = await this.dashboard(record.month);
    record.sourceFingerprint = latestSource.sourceFingerprintCurrent;
    record.sourceSummary = latestSource.controlSummary;
    record.sourceChangedAfterClose = false;
    record.sourceChangedDetectedAt = undefined;
    record.closeVersion = Number(record.closeVersion || 1) + 1;
    record.status = 'closed';
    record.reviewedBy = actor;
    record.reviewedAt = new Date();
    record.closedAt = new Date();
    record.reviewerNote = String(body.reviewerNote).trim();
    if (body.exceptionDisposition) record.varianceExplanation = [record.varianceExplanation, `Close exceptions: ${String(body.exceptionDisposition).trim()}`].filter(Boolean).join(' | ');
    await record.save();
    await this.appendVersion(record, actor, 'closed', String(body.reviewerNote).trim());
    await this.audit.record(actor, 'monthly_financial_period_closed', 'monthly_financial_close', String(record._id), `Closed financial period ${record.month}`, { month: record.month, unresolvedReconciliations: unresolved.length, criticalOpenEscalations: critical.length });
    return record.toObject();
  }

  async versionsForMonth(month: string) {
    this.validateMonth(month);
    return this.versions.find({month}).sort({createdAt: 1, versionNumber: 1}).limit(500).lean();
  }

  async reopen(id: string, body: any, actor: string) {
    const record: any = await this.closes.findById(id);
    if (!record) throw new NotFoundException('Monthly close record not found');
    if (record.status !== 'closed') throw new ConflictException('Only a closed period can be reopened.');
    const reason = String(body.reason || '').trim();
    if (reason.length < 8) throw new BadRequestException('Provide a specific reopen reason (at least 8 characters).');
    record.status = 'reopened';
    record.closeVersion = Number(record.closeVersion || 1) + 1;
    record.sourceChangedAfterClose = false;
    record.reopenedAt = new Date();
    record.reopenReason = reason;
    record.reviewerNote = [record.reviewerNote, `Reopened by ${actor}: ${reason}`].filter(Boolean).join(' | ');
    await record.save();
    await this.appendVersion(record, actor, 'reopened', reason);
    await this.audit.record(actor, 'monthly_financial_period_reopened', 'monthly_financial_close', String(record._id), `Reopened financial period ${record.month}`, { month: record.month, reason });
    return record.toObject();
  }
}