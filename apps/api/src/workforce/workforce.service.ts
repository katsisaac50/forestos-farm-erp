import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { FarmWorker, LabourTask, LabourEntry } from './workforce.schema';

@Injectable()
export class WorkforceService {
  constructor(
    @InjectModel(FarmWorker.name) private workers: Model<FarmWorker>,
    @InjectModel(LabourTask.name) private tasks: Model<LabourTask>,
    @InjectModel(LabourEntry.name) private entries: Model<LabourEntry>,
    private audit: AuditService,
  ) {}

  listWorkers() { return this.workers.find().sort({ displayName: 1 }).lean(); }
  async createWorker(dto: any, user: any) {
    if (!dto.workerCode || !dto.displayName || !dto.workerType) throw new BadRequestException('Worker code, display name and worker type are required.');
    if (dto.defaultDailyRateUgx !== undefined && Number(dto.defaultDailyRateUgx) < 0) throw new BadRequestException('Daily rate cannot be negative.');
    if (await this.workers.findOne({ workerCode: dto.workerCode }).lean()) throw new BadRequestException('Worker code already exists.');
    const row: any = await this.workers.create({ ...dto, defaultDailyRateUgx: dto.defaultDailyRateUgx === '' || dto.defaultDailyRateUgx == null ? undefined : Number(dto.defaultDailyRateUgx), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'farm_worker', String(row._id), `Created worker record ${row.workerCode}`);
    return row;
  }
  listTasks() { return this.tasks.find().sort({ plannedDate: -1 }).lean(); }
  async createTask(dto: any, user: any) {
    if (!dto.taskCode || !dto.title || !dto.activity || !dto.plannedDate) throw new BadRequestException('Task code, title, activity and planned date are required.');
    if (await this.tasks.findOne({ taskCode: dto.taskCode }).lean()) throw new BadRequestException('Task code already exists.');
    const row: any = await this.tasks.create({ ...dto, targetQuantity: dto.targetQuantity === '' || dto.targetQuantity == null ? undefined : Number(dto.targetQuantity), createdBy: user.email });
    await this.audit.record(user.email, 'created', 'labour_task', String(row._id), `Created labour task ${row.taskCode}`);
    return row;
  }
  async updateTask(id: string, dto: any, user: any) {
    const row: any = await this.tasks.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).lean();
    if (!row) throw new NotFoundException('Labour task not found.');
    await this.audit.record(user.email, 'updated', 'labour_task', String(row._id), `Updated labour task ${row.taskCode}`, { fields: Object.keys(dto) });
    return row;
  }
  listEntries(taskId?: string) { return this.entries.find(taskId ? { taskId } : {}).sort({ workDate: -1 }).lean(); }
  async createEntry(dto: any, user: any) {
    if (!dto.taskId || !dto.workerCode || !dto.workDate || dto.hoursWorked === undefined || dto.outputQuantity === undefined || dto.labourCostUgx === undefined) throw new BadRequestException('Task, worker, date, hours, output and labour cost are required.');
    const task: any = await this.tasks.findById(dto.taskId).lean();
    if (!task) throw new NotFoundException('Labour task not found.');
    if (!await this.workers.findOne({ workerCode: dto.workerCode }).lean()) throw new NotFoundException('Worker code not found.');
    const hours = Number(dto.hoursWorked), output = Number(dto.outputQuantity), cost = Number(dto.labourCostUgx);
    if (![hours, output, cost].every(Number.isFinite) || hours < 0 || output < 0 || cost < 0) throw new BadRequestException('Hours, output and labour cost must be non-negative numbers.');
    const row: any = await this.entries.create({ ...dto, hoursWorked: hours, outputQuantity: output, labourCostUgx: cost, recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'labour_entry', String(row._id), `Recorded labour output for ${dto.workerCode}`, { taskId: dto.taskId, hoursWorked: hours, outputQuantity: output, labourCostUgx: cost });
    return row;
  }
  async dashboard() {
    const [workers, tasks, entries]: any = await Promise.all([this.workers.find().lean(), this.tasks.find().lean(), this.entries.find().lean()]);
    const byTask = tasks.map((t: any) => {
      const te = entries.filter((e: any) => String(e.taskId) === String(t._id));
      const hours = te.reduce((s: number, e: any) => s + Number(e.hoursWorked || 0), 0);
      const output = te.reduce((s: number, e: any) => s + Number(e.outputQuantity || 0), 0);
      const costs = te.reduce((s: number, e: any) => s + Number(e.labourCostUgx || 0), 0);
      const units = [...new Set(te.map((e: any) => e.outputUnit).filter(Boolean))];
      return { ...t, recordedHours: hours, recordedOutput: output, recordedLabourCostUgx: costs, outputUnits: units, costPerOutputUnit: output > 0 && units.length <= 1 ? costs / output : null, entryCount: te.length };
    });
    const totalHours = entries.reduce((s: number, e: any) => s + Number(e.hoursWorked || 0), 0);
    const totalOutput = entries.reduce((s: number, e: any) => s + Number(e.outputQuantity || 0), 0);
    const totalCost = entries.reduce((s: number, e: any) => s + Number(e.labourCostUgx || 0), 0);
    return {
      generatedAt: new Date().toISOString(),
      totals: { workers: workers.length, activeWorkers: workers.filter((w: any) => w.status === 'active').length, tasks: tasks.length, openTasks: tasks.filter((t: any) => !['verified','cancelled'].includes(t.status)).length, submittedTasks: tasks.filter((t: any) => t.status === 'submitted').length, verifiedTasks: tasks.filter((t: any) => t.status === 'verified').length, recordedHours: totalHours, recordedOutput: totalOutput, recordedLabourCostUgx: totalCost, averageCostPerOutputUnit: totalOutput > 0 ? totalCost / totalOutput : null },
      tasks: byTask,
      notes: ['Output quantities should only be compared when activity, unit, quality standard and conditions are comparable.', 'Cost per output unit uses recorded labour cost and recorded output; it is not a full farm production cost.', 'Labour records are not automatically posted to the finance ledger.', 'Worker records contain personal contact information; restrict access and collect only what is necessary.'],
    };
  }
}
