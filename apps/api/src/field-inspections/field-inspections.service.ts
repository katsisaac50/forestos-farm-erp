import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFieldInspectionDto, ReviewFieldInspectionDto, SubmitFieldInspectionDto } from './dto';
import { FieldInspection, FieldInspectionDocument } from './field-inspection.schema';

@Injectable()
export class FieldInspectionsService {
  constructor(@InjectModel(FieldInspection.name) private readonly model: Model<FieldInspectionDocument>) {}

  private actor(reqUser: any): string {
    return String(reqUser?.email || reqUser?.username || reqUser?.sub || '');
  }
  private isOwner(user: any): boolean {
    const roles = user?.roles || (user?.role ? [user.role] : []);
    return Array.isArray(roles) && roles.includes('owner');
  }
  private assertCoords(lat: number, lon: number) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new BadRequestException('Coordinates are outside valid latitude/longitude ranges.');
    }
  }

  async create(dto: CreateFieldInspectionDto, user: any) {
    this.assertCoords(dto.latitude, dto.longitude);
    const assignedTo = dto.assignedTo.trim();
    if (!assignedTo) throw new BadRequestException('Assigned worker is required.');
    return this.model.create({
      ...dto, title: dto.title.trim(), assignedTo, locationLabel: dto.locationLabel.trim(),
      blockCode: dto.blockCode?.trim() || undefined,
      checklistSummary: dto.checklistSummary?.trim() || undefined,
      createdBy: this.actor(user), status: 'open',
    });
  }

  async list(user: any) {
    const query = this.isOwner(user) ? {} : { assignedTo: this.actor(user) };
    return this.model.find(query).sort({ createdAt: -1 }).limit(1000).lean();
  }

  async submit(id: string, dto: SubmitFieldInspectionDto, user: any) {
    const record = await this.model.findById(id);
    if (!record) throw new NotFoundException('Field inspection not found.');
    if (!this.isOwner(user) && record.assignedTo.toLowerCase() !== this.actor(user).toLowerCase()) {
      throw new ForbiddenException('You can submit only inspections assigned to your account.');
    }
    if (!['open', 'rejected'].includes(record.status)) {
      throw new BadRequestException('Only open or rejected inspections can be submitted.');
    }
    record.findings = dto.findings?.trim() || '';
    record.correctiveAction = dto.correctiveAction?.trim() || '';
    record.evidenceReference = dto.evidenceReference?.trim() || '';
    record.status = 'submitted';
    record.submittedAt = new Date();
    record.reviewNote = '';
    await record.save();
    return record;
  }

  async review(id: string, dto: ReviewFieldInspectionDto, user: any) {
    if (!this.isOwner(user)) throw new ForbiddenException('Owner access is required to review inspections.');
    const record = await this.model.findById(id);
    if (!record) throw new NotFoundException('Field inspection not found.');
    if (record.status !== 'submitted') throw new BadRequestException('Only submitted inspections can be reviewed.');
    if (!dto.reviewNote.trim()) throw new BadRequestException('A review note is required.');
    record.status = dto.status;
    record.reviewNote = dto.reviewNote.trim();
    record.reviewedAt = new Date();
    record.reviewedBy = this.actor(user);
    await record.save();
    return record;
  }
}
