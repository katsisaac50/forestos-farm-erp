import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationContext, hasOrganizationRole, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';
import { ApiaryAction } from '../apiary-actions/apiary-action.schema';
import { FieldWorker, FieldTask, FieldTaskEvent } from './field-workforce.schema';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Assigned', 'Accepted', 'In progress', 'Blocked', 'Submitted', 'Approved', 'Rejected', 'Cancelled'];
const MANAGER_ROLES = ['owner', 'admin', 'manager', 'supervisor', 'Owner', 'Admin', 'Manager', 'Supervisor'];

@Injectable()
export class FieldWorkforceService {
  constructor(
    @InjectModel(FieldWorker.name) private readonly workers: Model<FieldWorker>,
    @InjectModel(FieldTask.name) private readonly tasks: Model<FieldTask>,
    @InjectModel(FieldTaskEvent.name) private readonly events: Model<FieldTaskEvent>,
    @InjectModel(ApiaryAction.name) private readonly actions: Model<ApiaryAction>,
  ) {}

  private manager(context: OrganizationContext) {
    if (!hasOrganizationRole(context, MANAGER_ROLES)) throw new ForbiddenException('Manager or supervisor role required');
  }
  private async worker(context: OrganizationContext, workerId: string) {
    const worker = await this.workers.findOne(organizationFilter(context, { workerId, status: 'Active' })).lean();
    if (!worker) throw new NotFoundException('Active worker not found in selected organization');
    return worker;
  }
  private async log(context: OrganizationContext, taskId: string, actorId: string, eventType: string, details?: any, note?: string) {
    await this.events.create({ organizationId: context.organizationId, taskId, actorId, eventType, details, note });
  }

  async listWorkers(raw: OrganizationContext) {
    const c = requireOrganizationContext(raw);
    return this.workers.find(organizationFilter(c)).sort({ displayName: 1 }).limit(1000).lean();
  }
  async createWorker(dto: any, raw: OrganizationContext, actorId: string) {
    const c = requireOrganizationContext(raw); this.manager(c);
    if (!dto?.displayName?.trim()) throw new BadRequestException('displayName is required');
    const workerId = String(dto.workerId || `FW-${new Types.ObjectId().toHexString()}`);
    return this.workers.create({
      organizationId: c.organizationId, workerId, displayName: dto.displayName.trim(),
      email: dto.email, phone: dto.phone, skills: dto.skills, status: dto.status || 'Active',
      createdBy: actorId, updatedBy: actorId,
    });
  }

  async listTasks(raw: OrganizationContext, filters: any = {}) {
    const c = requireOrganizationContext(raw);
    const query: any = organizationFilter(c);
    if (filters.status) {
      if (!STATUSES.includes(filters.status)) throw new BadRequestException('Invalid status filter');
      query.status = filters.status;
    }
    if (filters.workerId) query.workerId = filters.workerId;
    if (filters.overdueOnly === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['Approved', 'Cancelled'] };
    }
    const limit = Math.min(500, Math.max(1, Number(filters.limit) || 100));
    return this.tasks.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(limit).lean();
  }

  async createTask(dto: any, raw: OrganizationContext, actorId: string) {
    const c = requireOrganizationContext(raw); this.manager(c);
    if (!dto?.title?.trim() || !dto?.workerId) throw new BadRequestException('title and workerId are required');
    if (dto.priority && !PRIORITIES.includes(dto.priority)) throw new BadRequestException('Invalid priority');
    if (dto.dueDate && Number.isNaN(Date.parse(dto.dueDate))) throw new BadRequestException('dueDate must be a valid date');
    await this.worker(c, dto.workerId);
    if (dto.apiaryActionId) {
      const action = await this.actions.findOne(organizationFilter(c, { actionId: dto.apiaryActionId })).select('actionId').lean();
      if (!action) throw new NotFoundException('Apiary action not found in selected organization');
    }
    const taskId = `FT-${new Types.ObjectId().toHexString()}`;
    const task = await this.tasks.create({
      organizationId: c.organizationId, taskId, title: dto.title.trim(), description: dto.description,
      priority: dto.priority || 'Medium', status: 'Assigned', workerId: dto.workerId,
      apiaryActionId: dto.apiaryActionId, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy: actorId, updatedBy: actorId,
    });
    await this.log(c, taskId, actorId, 'assigned', { workerId: dto.workerId, priority: task.priority });
    return task;
  }

  async transition(id: string, dto: any, raw: OrganizationContext, actorId: string) {
    const c = requireOrganizationContext(raw);
    const task = await this.tasks.findOne(organizationFilter(c, { _id: id }));
    if (!task) throw new NotFoundException('Task not found in selected organization');
    const manager = hasOrganizationRole(c, MANAGER_ROLES);
    const ownWorker = task.workerId === actorId;
    const status = dto?.status;
    if (!status || !STATUSES.includes(status)) throw new BadRequestException('A valid status is required');
    const managerOnly = ['Assigned', 'Approved', 'Rejected', 'Cancelled'];
    if (managerOnly.includes(status) && !manager) throw new ForbiddenException('Manager or supervisor role required for this transition');
    if (!manager && !ownWorker) throw new ForbiddenException('Only the assigned worker or a manager may update this task');
    const allowed: Record<string, string[]> = {
      Assigned: ['Accepted', 'Cancelled'],
      Accepted: ['In progress', 'Blocked', 'Cancelled'],
      'In progress': ['Blocked', 'Submitted', 'Cancelled'],
      Blocked: ['In progress', 'Cancelled'],
      Submitted: ['Approved', 'Rejected'],
      Rejected: ['In progress', 'Cancelled'],
      Approved: [],
      Cancelled: [],
    };
    if (!manager && !(allowed[task.status] || []).includes(status)) {
      throw new BadRequestException(`Transition ${task.status} -> ${status} is not allowed`);
    }
    if (manager && !STATUSES.includes(status)) throw new BadRequestException('Invalid status');
    if (status === 'Accepted' && !manager && !ownWorker) throw new ForbiddenException('Only assigned worker may accept');
    const before = task.status;
    task.status = status;
    task.updatedBy = actorId;
    if (status === 'In progress' && !task.startedAt) task.startedAt = new Date();
    if (status === 'Submitted') {
      task.submittedAt = new Date();
      if (dto.completionNotes !== undefined) task.completionNotes = String(dto.completionNotes).slice(0, 2000);
      if (dto.evidenceReferences !== undefined) {
        if (!Array.isArray(dto.evidenceReferences) || dto.evidenceReferences.some((x: any) => typeof x !== 'string' || x.length > 500)) {
          throw new BadRequestException('evidenceReferences must be an array of strings, each at most 500 characters');
        }
        task.evidenceReferences = dto.evidenceReferences.slice(0, 20);
      }
    }
    if (status === 'Approved' || status === 'Rejected') {
      task.reviewedAt = new Date();
      if (dto.reviewNotes !== undefined) task.reviewNotes = String(dto.reviewNotes).slice(0, 1000);
    }
    await task.save();
    await this.log(c, task.taskId, actorId, 'status_changed', { before, after: status }, dto.note);
    return task;
  }

  async summary(raw: OrganizationContext) {
    const c = requireOrganizationContext(raw);
    const rows: any[] = await this.tasks.find(organizationFilter(c)).select('status priority dueDate').limit(10000).lean();
    const result: any = { total: rows.length, overdue: 0, byStatus: {} };
    for (const s of STATUSES) result.byStatus[s] = 0;
    for (const r of rows) {
      result.byStatus[r.status] = (result.byStatus[r.status] || 0) + 1;
      if (!['Approved', 'Cancelled'].includes(r.status) && r.dueDate && new Date(r.dueDate).getTime() < Date.now()) result.overdue++;
    }
    return result;
  }

  async history(id: string, raw: OrganizationContext) {
    const c = requireOrganizationContext(raw);
    const task = await this.tasks.findOne(organizationFilter(c, { _id: id })).select('taskId').lean();
    if (!task) throw new NotFoundException('Task not found in selected organization');
    return this.events.find({ organizationId: c.organizationId, taskId: task.taskId }).sort({ createdAt: -1 }).limit(500).lean();
  }
}
