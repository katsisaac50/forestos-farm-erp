import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';
import { Hive } from '../hives/hive.schema';
import { ApiaryInspection } from '../apiary-operations/apiary-operation.schema';
import { ApiaryAction, ApiaryActionEvent } from './apiary-action.schema';

const STATUSES = ['Open', 'In progress', 'Blocked', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const MUTABLE = ['title', 'description', 'priority', 'status', 'assignedTo', 'dueDate', 'completionNotes'];

@Injectable()
export class ApiaryActionsService {
  constructor(
    @InjectModel(ApiaryAction.name) private readonly actions: Model<ApiaryAction>,
    @InjectModel(ApiaryActionEvent.name) private readonly events: Model<ApiaryActionEvent>,
    @InjectModel(Hive.name) private readonly hives: Model<Hive>,
    @InjectModel(ApiaryInspection.name) private readonly inspections: Model<ApiaryInspection>,
  ) {}

  private async assertHive(context: OrganizationContext, hiveId: string) {
    if (!hiveId || !(await this.hives.findOne(organizationFilter(context, { hiveId })).select('_id').lean())) {
      throw new NotFoundException('Hive not found in the selected organization');
    }
  }

  private async event(context: OrganizationContext, actionId: string, actorId: string, eventType: string, changes?: any, note?: string) {
    await this.events.create({ organizationId: context.organizationId, actionId, actorId, eventType, changes, note });
  }

  async list(rawContext: OrganizationContext, filters: any = {}) {
    const context = requireOrganizationContext(rawContext);
    const query: any = organizationFilter(context);
    if (filters.status) {
      if (!STATUSES.includes(filters.status)) throw new BadRequestException('Invalid status filter');
      query.status = filters.status;
    }
    if (filters.hiveId) query.hiveId = filters.hiveId;
    if (filters.overdueOnly === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['Completed', 'Cancelled'] };
    }
    const limit = Math.min(500, Math.max(1, Number(filters.limit) || 100));
    return this.actions.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(limit).lean();
  }

  async create(dto: any, rawContext: OrganizationContext, actorId: string) {
    const context = requireOrganizationContext(rawContext);
    if (!dto?.hiveId || !dto?.title?.trim()) throw new BadRequestException('hiveId and title are required');
    await this.assertHive(context, dto.hiveId);
    if (dto.priority && !PRIORITIES.includes(dto.priority)) throw new BadRequestException('Invalid priority');
    if (dto.status && !STATUSES.includes(dto.status)) throw new BadRequestException('Invalid status');
    if (dto.sourceInspectionId) {
      if (!Types.ObjectId.isValid(dto.sourceInspectionId)) throw new BadRequestException('sourceInspectionId must be a valid inspection ID');
      const inspection = await this.inspections.findOne(organizationFilter(context, {
        _id: new Types.ObjectId(dto.sourceInspectionId), hiveId: dto.hiveId,
      })).select('_id').lean();
      if (!inspection) throw new NotFoundException('Source inspection not found for this hive and organization');
    }
    if (dto.dueDate && Number.isNaN(Date.parse(dto.dueDate))) throw new BadRequestException('dueDate must be a valid date');
    const actionId = `AA-${new Types.ObjectId().toHexString()}`;
    const payload: any = {
      organizationId: context.organizationId, actionId, hiveId: dto.hiveId,
      sourceInspectionId: dto.sourceInspectionId,
      title: dto.title.trim(), description: dto.description,
      priority: dto.priority || 'Medium', status: dto.status || 'Open',
      assignedTo: dto.assignedTo, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      completionNotes: dto.completionNotes,
      completedAt: dto.status === 'Completed' ? new Date() : undefined,
      createdBy: actorId, updatedBy: actorId,
    };
    const created = await this.actions.create(payload);
    await this.event(context, actionId, actorId, 'created', { title: payload.title, status: payload.status, priority: payload.priority });
    return created;
  }

  async update(id: string, dto: any, rawContext: OrganizationContext, actorId: string) {
    const context = requireOrganizationContext(rawContext);
    const action = await this.actions.findOne(organizationFilter(context, { _id: id }));
    if (!action) throw new NotFoundException('Action not found in the selected organization');
    const changes: any = {};
    for (const key of MUTABLE) {
      if (Object.prototype.hasOwnProperty.call(dto || {}, key)) changes[key] = dto[key];
    }
    if (!Object.keys(changes).length) throw new BadRequestException('No supported action fields supplied');
    if (changes.title !== undefined && (typeof changes.title !== 'string' || !changes.title.trim())) throw new BadRequestException('title cannot be empty');
    if (changes.priority !== undefined && !PRIORITIES.includes(changes.priority)) throw new BadRequestException('Invalid priority');
    if (changes.status !== undefined && !STATUSES.includes(changes.status)) throw new BadRequestException('Invalid status');
    if (changes.dueDate !== undefined) {
      if (changes.dueDate === null || changes.dueDate === '') changes.dueDate = undefined;
      else if (Number.isNaN(Date.parse(changes.dueDate))) throw new BadRequestException('dueDate must be a valid date');
      else changes.dueDate = new Date(changes.dueDate);
    }
    if (changes.title) changes.title = changes.title.trim();
    const before: any = {};
    for (const key of Object.keys(changes)) before[key] = (action as any)[key];
    if (changes.status === 'Completed') changes.completedAt = new Date();
    else if (changes.status && changes.status !== 'Completed') changes.completedAt = undefined;
    changes.updatedBy = actorId;
    Object.assign(action, changes);
    await action.save();
    await this.event(context, action.actionId, actorId, 'updated', { before, after: changes }, dto?.auditNote);
    return action;
  }

  async summary(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const rows: any[] = await this.actions.find(organizationFilter(context)).select('status priority dueDate').limit(10000).lean();
    const now = Date.now();
    const result: any = { total: rows.length, overdue: 0, highOrCriticalOpen: 0, byStatus: {} };
    for (const status of STATUSES) result.byStatus[status] = 0;
    for (const row of rows) {
      result.byStatus[row.status] = (result.byStatus[row.status] || 0) + 1;
      const active = !['Completed', 'Cancelled'].includes(row.status);
      if (active && row.dueDate && new Date(row.dueDate).getTime() < now) result.overdue++;
      if (active && ['High', 'Critical'].includes(row.priority)) result.highOrCriticalOpen++;
    }
    return result;
  }

  async history(id: string, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const action = await this.actions.findOne(organizationFilter(context, { _id: id })).select('actionId').lean();
    if (!action) throw new NotFoundException('Action not found in the selected organization');
    return this.events.find({ organizationId: context.organizationId, actionId: action.actionId })
      .sort({ createdAt: -1 }).limit(500).lean();
  }
}
