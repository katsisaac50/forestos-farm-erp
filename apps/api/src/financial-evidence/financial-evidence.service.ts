import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { FinancialAction } from '../financial-action-centre/financial-action.schema';
import { FinancialEvidence } from './financial-evidence.schema';
import { CreateEvidenceDto } from './create-evidence.dto';
import { ReviewEvidenceDto } from './review-evidence.dto';
@Injectable()
export class FinancialEvidenceService {
 constructor(
  @InjectModel(FinancialEvidence.name) private readonly evidence: Model<FinancialEvidence>,
  @InjectModel(FinancialAction.name) private readonly actions: Model<FinancialAction>,
 ) {}
 async list(requestedMonth?: string, status?: string) {
  const month = requestedMonth || new Date().toISOString().slice(0,7);
  this.validateMonth(month);
  const query: Record<string, any> = { month };
  if (status) {
   if (!['Pending review','Accepted','Rejected','Needs more information'].includes(status)) throw new BadRequestException('Invalid evidence review status');
   query.reviewStatus = status;
  }
  return this.evidence.find(query).sort({ reviewStatus: 1, createdAt: -1 }).limit(1000).lean();
 }
 async create(dto: CreateEvidenceDto) {
  this.validateMonth(dto.month);
  if (dto.sourceActionId && !(await this.actions.exists({ actionId: dto.sourceActionId }))) throw new BadRequestException('sourceActionId must refer to an existing corrective action');
  const evidenceId = `EVD-${randomUUID()}`;
  const doc = new this.evidence({ ...dto, evidenceId, reviewStatus: 'Pending review',
   history: [{ at: new Date(), event: 'Evidence reference registered', status: 'Pending review' }] });
  await doc.save();
  return doc;
 }
 async review(evidenceId: string, dto: ReviewEvidenceDto) {
  const doc = await this.evidence.findOne({ evidenceId });
  if (!doc) throw new NotFoundException('Evidence record not found');
  const previous = doc.reviewStatus;
  doc.reviewStatus = dto.reviewStatus;
  doc.reviewNote = dto.reviewNote.trim();
  doc.reviewedBy = 'owner';
  doc.reviewedAt = new Date();
  doc.history.push({ at: new Date(), event: 'Evidence reviewed', from: previous, to: dto.reviewStatus, note: dto.reviewNote.trim() });
  await doc.save();
  return doc;
 }
 private validateMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('month must use YYYY-MM format');
 }
}
