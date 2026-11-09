import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FarmRisk, FarmRiskDocument, RiskAction, RiskActionDocument } from './risk.schema';

const riskStatuses = ['open', 'monitoring', 'mitigating', 'accepted', 'closed'];
const actionStatuses = ['open', 'in_progress', 'completed', 'blocked'];
const categories = ['fire','drought','pests_disease','tree_mortality','weather','market_buyer','cashflow','workforce','apiary_colony','operations','compliance','security','other'];
const lines = ['eucalyptus','beekeeping','infrastructure','finance','workforce','whole_farm','other'];
const scoreBand = (score: number) => score >= 16 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low';
const numberInRange = (v: any, name: string, min = 1, max = 5) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${name} must be an integer from ${min} to ${max}`);
  return n;
};
const cleanDate = (v: any, name: string) => {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new BadRequestException(`${name} must be YYYY-MM-DD or blank`);
  return v;
};
const publicRisk = (r: any) => {
  const o = r?.toObject ? r.toObject() : r;
  const inherentScore = Number(o.likelihood) * Number(o.impact);
  const hasResidual = Number.isInteger(o.residualLikelihood) && Number.isInteger(o.residualImpact);
  const residualScore = hasResidual ? o.residualLikelihood * o.residualImpact : null;
  return { ...o, inherentScore, inherentBand: scoreBand(inherentScore), residualScore, residualBand: residualScore === null ? null : scoreBand(residualScore) };
};

@Injectable()
export class RiskManagementService {
  constructor(
    @InjectModel(FarmRisk.name) private risks: Model<FarmRiskDocument>,
    @InjectModel(RiskAction.name) private actions: Model<RiskActionDocument>,
  ) {}

  async dashboard() {
    const risks = (await this.risks.find().sort({ updatedAt: -1 }).lean()).map(publicRisk);
    const actions = await this.actions.find().lean();
    const today = new Date().toISOString().slice(0, 10);
    const active = risks.filter(r => r.status !== 'closed');
    const openActions = actions.filter(a => a.status !== 'completed');
    const overdueActions = openActions.filter(a => a.dueDate && a.dueDate < today);
    const overdueReviews = active.filter(r => r.reviewDate && r.reviewDate < today);
    const topRisks = active.sort((a, b) => b.inherentScore - a.inherentScore).slice(0, 8);
    const count = (band: string) => active.filter(r => r.inherentBand === band).length;
    return {
      totals: { activeRisks: active.length, critical: count('critical'), high: count('high'), openActions: openActions.length, overdueActions: overdueActions.length, overdueReviews: overdueReviews.length },
      topRisks, overdueActions: overdueActions.slice(0, 10), overdueReviews: overdueReviews.slice(0, 10),
    };
  }

  async listRisks(query: any = {}) {
    const filter: any = {};
    if (query.status && riskStatuses.includes(query.status)) filter.status = query.status;
    if (query.category && categories.includes(query.category)) filter.category = query.category;
    if (query.businessLine && lines.includes(query.businessLine)) filter.businessLine = query.businessLine;
    const risks = await this.risks.find(filter).sort({ updatedAt: -1 }).lean();
    return risks.map(publicRisk).sort((a, b) => b.inherentScore - a.inherentScore);
  }

  async createRisk(body: any, actor = '') {
    if (!body?.riskCode?.trim() || !body?.title?.trim() || !body?.description?.trim()) throw new BadRequestException('riskCode, title and description are required');
    if (!categories.includes(body.category)) throw new BadRequestException('Invalid category');
    if (!lines.includes(body.businessLine || 'whole_farm')) throw new BadRequestException('Invalid businessLine');
    const likelihood = numberInRange(body.likelihood, 'likelihood');
    const impact = numberInRange(body.impact, 'impact');
    const residualLikelihood = body.residualLikelihood === '' || body.residualLikelihood === null || body.residualLikelihood === undefined ? null : numberInRange(body.residualLikelihood, 'residualLikelihood');
    const residualImpact = body.residualImpact === '' || body.residualImpact === null || body.residualImpact === undefined ? null : numberInRange(body.residualImpact, 'residualImpact');
    if ((residualLikelihood === null) !== (residualImpact === null)) throw new BadRequestException('Enter both residual likelihood and residual impact, or leave both blank');
    const status = body.status || 'open';
    if (!riskStatuses.includes(status)) throw new BadRequestException('Invalid status');
    const record = await this.risks.create({
      riskCode: body.riskCode.trim(), title: body.title.trim(), category: body.category,
      businessLine: body.businessLine || 'whole_farm', description: body.description.trim(),
      likelihood, impact, existingControls: body.existingControls || '', mitigationPlan: body.mitigationPlan || '',
      ownerResponsible: body.ownerResponsible || '', reviewDate: cleanDate(body.reviewDate, 'reviewDate'),
      dueDate: cleanDate(body.dueDate, 'dueDate'), status, residualLikelihood, residualImpact,
      evidenceReference: body.evidenceReference || '', createdBy: actor,
    });
    return publicRisk(record);
  }

  async updateRisk(id: string, body: any) {
    const record = await this.risks.findById(id);
    if (!record) throw new NotFoundException('Risk not found');
    if (body.likelihood !== undefined) record.likelihood = numberInRange(body.likelihood, 'likelihood');
    if (body.impact !== undefined) record.impact = numberInRange(body.impact, 'impact');
    if (body.residualLikelihood !== undefined) {
  record.residualLikelihood =
    body.residualLikelihood === '' || body.residualLikelihood === null
      ? undefined
      : numberInRange(body.residualLikelihood, 'residualLikelihood');
}

if (body.residualImpact !== undefined) {
  record.residualImpact =
    body.residualImpact === '' || body.residualImpact === null
      ? undefined
      : numberInRange(body.residualImpact, 'residualImpact');
}
    if ((record.residualLikelihood == null) !== (record.residualImpact == null)) throw new BadRequestException('Enter both residual likelihood and residual impact, or leave both blank');
    for (const key of ['title','description','existingControls','mitigationPlan','ownerResponsible','evidenceReference'] as const) if (body[key] !== undefined) (record as any)[key] = body[key];
    if (body.category !== undefined) { if (!categories.includes(body.category)) throw new BadRequestException('Invalid category'); record.category = body.category; }
    if (body.businessLine !== undefined) { if (!lines.includes(body.businessLine)) throw new BadRequestException('Invalid businessLine'); record.businessLine = body.businessLine; }
    if (body.status !== undefined) { if (!riskStatuses.includes(body.status)) throw new BadRequestException('Invalid status'); record.status = body.status; }
    if (body.reviewDate !== undefined) record.reviewDate = cleanDate(body.reviewDate, 'reviewDate') as any;
    if (body.dueDate !== undefined) record.dueDate = cleanDate(body.dueDate, 'dueDate') as any;
    await record.save();
    return publicRisk(record);
  }

  async listActions(riskId?: string) {
    const filter = riskId ? { riskId } : {};
    return this.actions.find(filter).sort({ dueDate: 1, updatedAt: -1 }).lean();
  }
  async createAction(body: any, actor = '') {
    if (!body?.riskId || !body?.title?.trim()) throw new BadRequestException('riskId and title are required');
    if (!(await this.risks.exists({ _id: body.riskId }))) throw new NotFoundException('Risk not found');
    const status = body.status || 'open';
    if (!actionStatuses.includes(status)) throw new BadRequestException('Invalid action status');
    return this.actions.create({ riskId: body.riskId, title: body.title.trim(), actionOwner: body.actionOwner || '', dueDate: cleanDate(body.dueDate, 'dueDate'), status, note: body.note || '', completedAt: status === 'completed' ? new Date() :  undefined, createdBy: actor });
  }
  async updateAction(id: string, body: any) {
    const record = await this.actions.findById(id);
    if (!record) throw new NotFoundException('Risk action not found');
    if (body.title !== undefined) record.title = body.title;
    if (body.actionOwner !== undefined) record.actionOwner = body.actionOwner;
    if (body.note !== undefined) record.note = body.note;
    if (body.dueDate !== undefined) record.dueDate = cleanDate(body.dueDate, 'dueDate') as any;
    if (body.status !== undefined) {
      if (!actionStatuses.includes(body.status)) throw new BadRequestException('Invalid action status');
      record.status = body.status;
      record.completedAt =
  body.status === 'completed' ? new Date() : undefined;
    }
    await record.save();
    return record;
  }
}
