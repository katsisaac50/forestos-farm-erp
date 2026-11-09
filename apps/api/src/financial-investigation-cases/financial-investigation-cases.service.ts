import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialInvestigationCase } from './financial-investigation-case.schema';
import { FinancialInvestigationCaseEvent } from './financial-investigation-case-event.schema';
import { CreateInvestigationCaseDto, UpdateInvestigationCaseDto } from './dto';
@Injectable()
export class FinancialInvestigationCasesService {
 constructor(@InjectModel(FinancialInvestigationCase.name) private cases: Model<FinancialInvestigationCase>,
 @InjectModel(FinancialInvestigationCaseEvent.name) private events: Model<FinancialInvestigationCaseEvent>) {}
 async list(status?: string, severity?: string) {
  if (status && !['open','under_investigation','awaiting_evidence','resolved','closed'].includes(status)) throw new BadRequestException('Invalid status filter');
  if (severity && !['critical','high','review','medium','low'].includes(severity)) throw new BadRequestException('Invalid severity filter');
  const filter: Record<string,string> = {}; if (status) filter.status=status; if (severity) filter.severity=severity;
  return this.cases.find(filter).sort({updatedAt:-1}).limit(500).lean();
 }
 async get(id: string) {
  const record = await this.cases.findById(id).lean(); if (!record) throw new NotFoundException('Case not found');
  const events = await this.events.find({caseId:id}).sort({createdAt:1}).limit(1000).lean(); return {...record,events};
 }
 async create(dto: CreateInvestigationCaseDto, actor: string) {
  const needsReview = dto.severity === 'critical' || dto.severity === 'high';
  const r = await this.cases.create({...dto,status:'open',createdBy:actor,lastUpdatedBy:actor,recordVersion:1,secondReviewRequired:needsReview});
  await this.events.create({caseId:String(r._id),caseCode:r.caseCode,eventType:'created',actor,reason:'Investigation case created',newValue:'open'});
  if (r.assignedTo) await this.events.create({caseId:String(r._id),caseCode:r.caseCode,eventType:'assigned',actor,reason:'Initial assignment',newValue:r.assignedTo});
  return r.toObject();
 }
 async update(id: string, dto: UpdateInvestigationCaseDto, actor: string) {
  const r = await this.cases.findById(id); if (!r) throw new NotFoundException('Case not found');
  if (dto.expectedVersion !== undefined && dto.expectedVersion !== r.recordVersion) throw new ConflictException('Case changed. Refresh and retry.');
  if (r.status === 'closed' && dto.status && dto.status !== 'closed') throw new ConflictException('Use reopen action for closed cases.');
  if (dto.status === 'closed' && r.secondReviewRequired && !r.secondReviewedBy) throw new BadRequestException('Independent second review required before closure.');
  const events: any[] = [];
  if (dto.assignedTo !== undefined && dto.assignedTo !== r.assignedTo) { events.push({eventType:'assigned',reason:'Assignment updated',previousValue:r.assignedTo||'',newValue:dto.assignedTo}); r.assignedTo=dto.assignedTo; }
  if (dto.status && dto.status !== r.status) { events.push({eventType:dto.status==='closed'?'closed':'status_changed',reason:dto.note||'Status updated',previousValue:r.status,newValue:dto.status}); r.status=dto.status; }
  if (dto.evidenceReference?.trim()) { events.push({eventType:'evidence_added',reason:dto.note||'Evidence reference added',evidenceReference:dto.evidenceReference.trim()}); r.evidenceReference=dto.evidenceReference.trim(); }
  if (dto.resolutionSummary?.trim()) {
   if (!['resolved','closed'].includes(dto.status||r.status)) throw new BadRequestException('Set status to resolved or closed before adding resolution summary.');
   events.push({eventType:'resolution_proposed',reason:dto.note||'Resolution summary added',newValue:dto.resolutionSummary.trim()}); r.resolutionSummary=dto.resolutionSummary.trim();
  }
  if (dto.closeReason?.trim()) r.closeReason=dto.closeReason.trim();
  if (dto.note?.trim()) events.push({eventType:'note_added',reason:dto.note.trim()});
  if (!events.length && dto.closeReason === undefined) throw new BadRequestException('No case changes supplied.');
  r.recordVersion += 1; r.lastUpdatedBy=actor; await r.save();
  for (const e of events) await this.events.create({caseId:String(r._id),caseCode:r.caseCode,actor,...e});
  return this.get(id);
 }
 async secondReview(id: string, actor: string, reason: string) {
  if (!reason?.trim()) throw new BadRequestException('Second-review reason required.');
  const r=await this.cases.findById(id); if (!r) throw new NotFoundException('Case not found');
  if (!r.secondReviewRequired) throw new BadRequestException('Second review not required.');
  if (r.createdBy===actor) throw new BadRequestException('Creator cannot independently review own case.');
  r.secondReviewedBy=actor; r.secondReviewedAt=new Date(); r.recordVersion+=1; r.lastUpdatedBy=actor; await r.save();
  await this.events.create({caseId:String(r._id),caseCode:r.caseCode,eventType:'second_reviewed',actor,reason:reason.trim()}); return this.get(id);
 }
 async reopen(id: string, actor: string, reason: string) {
  if (!reason?.trim()) throw new BadRequestException('Reopen reason required.');
  const r=await this.cases.findById(id); if (!r) throw new NotFoundException('Case not found');
  if (!['resolved','closed'].includes(r.status)) throw new BadRequestException('Only resolved/closed cases can be reopened.');
  const previous=r.status; r.status='open'; r.secondReviewedBy=undefined; r.secondReviewedAt=undefined; r.recordVersion+=1; r.lastUpdatedBy=actor; await r.save();
  await this.events.create({caseId:String(r._id),caseCode:r.caseCode,eventType:'reopened',actor,reason:reason.trim(),previousValue:previous,newValue:'open'}); return this.get(id);
 }
}
