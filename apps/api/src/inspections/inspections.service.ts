import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inspection } from './inspection.schema';
import { CreateInspectionDto, UpdateInspectionDto } from './dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectModel(Inspection.name) private model: Model<Inspection>,
    private audit: AuditService,
  ) {}

  async list(user: { email: string; role: string }) {
    const filter =
      user.role === 'owner' ? {} : { assignedTo: user.email.toLowerCase() };
    const rows = await this.model.find(filter).sort({ dueDate: 1 }).limit(500).lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rows.map((r: any) =>
      r.status !== 'Completed' && new Date(r.dueDate) < today && r.status !== 'Overdue'
        ? { ...r, status: 'Overdue' }
        : r,
    );
  }

  async create(dto: CreateInspectionDto, user: { email: string }) {
    const row: any = await this.model.create({
      ...dto,
      assignedTo: dto.assignedTo.trim().toLowerCase(),
      createdBy: user.email.toLowerCase(),
    });
    await this.audit.record(
      user.email,
      'created',
      'inspection',
      String(row._id),
      `Scheduled ${row.title} for ${row.siteOrBlock}`,
    );
    return row;
  }

  async update(id: string, dto: UpdateInspectionDto, user: { email: string; role: string }) {
    const row = await this.model.findById(id);
    if (!row) throw new NotFoundException('Inspection not found');
    if (user.role !== 'owner' && row.assignedTo !== user.email.toLowerCase())
      throw new ForbiddenException(
        'You can only update inspections assigned to your account',
      );
    if (
      user.role !== 'owner' &&
      Object.keys(dto).some(
        (k) =>
          !['status', 'findings', 'correctiveAction', 'photoReference'].includes(k),
      )
    )
      throw new ForbiddenException('Not permitted');
    if (dto.status === 'Completed') row.completedAt = new Date();
    Object.assign(row, dto);
    return row.save();
  }
}