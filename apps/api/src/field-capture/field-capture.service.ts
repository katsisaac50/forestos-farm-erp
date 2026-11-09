import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationContext, hasOrganizationRole, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';
import { FieldTask } from '../field-workforce/field-workforce.schema';
import { FieldCapture } from './field-capture.schema';

const MANAGERS = ['owner', 'admin', 'manager', 'supervisor', 'Owner', 'Admin', 'Manager', 'Supervisor'];
const CAPTURE_TYPES = ['Inspection', 'Task completion', 'Incident', 'Harvest', 'Other'];
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

@Injectable()
export class FieldCaptureService {
  constructor(
    @InjectModel(FieldCapture.name) private readonly captures: Model<FieldCapture>,
    @InjectModel(FieldTask.name) private readonly tasks: Model<FieldTask>,
  ) {}

  private isManager(c: OrganizationContext) { return hasOrganizationRole(c, MANAGERS); }
  private async assertTask(c: OrganizationContext, taskId: string) {
    const task = await this.tasks.findOne(organizationFilter(c, { taskId })).lean();
    if (!task) throw new NotFoundException('Task not found in selected organization');
    return task;
  }

  async submit(dto: any, raw: OrganizationContext, actorId: string) {
    const c = requireOrganizationContext(raw);
    if (!dto?.clientSubmissionId || typeof dto.clientSubmissionId !== 'string' || dto.clientSubmissionId.length > 120) {
      throw new BadRequestException('clientSubmissionId is required (max 120 characters) for retry-safe submission');
    }
    if (!dto.taskId || !dto.title?.trim()) throw new BadRequestException('taskId and title are required');
    if (!CAPTURE_TYPES.includes(dto.captureType)) throw new BadRequestException('Invalid captureType');
    if (dto.notes !== undefined && (typeof dto.notes !== 'string' || dto.notes.length > 5000)) throw new BadRequestException('notes must be text up to 5000 characters');
    const prior = await this.captures.findOne(organizationFilter(c, { clientSubmissionId: dto.clientSubmissionId })).lean();
    if (prior) return { ...prior, duplicateSubmission: true };
    const task: any = await this.assertTask(c, dto.taskId);
    const assignedIdentityMatches = task.workerId === actorId;
    if (!this.isManager(c) && !assignedIdentityMatches) throw new ForbiddenException('Only the assigned worker or a manager may submit evidence for this task');

    const manifest = Array.isArray(dto.evidenceManifest) ? dto.evidenceManifest : [];
    if (manifest.length > 10) throw new BadRequestException('A maximum of 10 evidence manifest entries is allowed');
    const safeManifest = manifest.map((item: any) => {
      if (!item || typeof item.filename !== 'string' || item.filename.length > 200 ||
          !MIME_TYPES.includes(item.mimeType) ||
          !Number.isInteger(item.sizeBytes) || item.sizeBytes < 1 || item.sizeBytes > 15 * 1024 * 1024 ||
          typeof item.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(item.sha256)) {
        throw new BadRequestException('Each evidence entry needs filename, allowed mimeType, sizeBytes (max 15 MB), and SHA-256 hex digest');
      }
      return { filename: item.filename, mimeType: item.mimeType, sizeBytes: item.sizeBytes, sha256: item.sha256 };
    });

    let location: any = undefined;
    const locationConsent = dto.locationConsent === true;
    if (locationConsent && dto.location) {
      const lat = Number(dto.location.latitude), lon = Number(dto.location.longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new BadRequestException('Location coordinates are invalid');
      }
      location = { latitude: lat, longitude: lon, accuracyMeters: Number.isFinite(Number(dto.location.accuracyMeters)) ? Math.max(0, Number(dto.location.accuracyMeters)) : undefined, capturedAt: dto.location.capturedAt };
    }
    const captureId = `FC-${new Types.ObjectId().toHexString()}`;
    const created = await this.captures.create({
      organizationId: c.organizationId, captureId, clientSubmissionId: dto.clientSubmissionId,
      taskId: dto.taskId, workerId: task.workerId, captureType: dto.captureType, title: dto.title.trim(),
      notes: dto.notes, evidenceManifest: safeManifest, location, locationConsent,
      reviewStatus: 'Submitted', createdBy: actorId,
    });
    return created;
  }

  async list(raw: OrganizationContext, filters: any = {}) {
    const c = requireOrganizationContext(raw);
    const query: any = organizationFilter(c);
    if (filters.taskId) query.taskId = filters.taskId;
    if (filters.reviewStatus) {
      if (!['Submitted', 'Reviewed', 'Needs changes'].includes(filters.reviewStatus)) throw new BadRequestException('Invalid reviewStatus');
      query.reviewStatus = filters.reviewStatus;
    }
    const limit = Math.min(300, Math.max(1, Number(filters.limit) || 100));
    return this.captures.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async review(id: string, dto: any, raw: OrganizationContext, actorId: string) {
    const c = requireOrganizationContext(raw);
    if (!this.isManager(c)) throw new ForbiddenException('Manager or supervisor role required to review evidence');
    if (!['Reviewed', 'Needs changes'].includes(dto?.reviewStatus)) throw new BadRequestException('reviewStatus must be Reviewed or Needs changes');
    if (dto.reviewNotes !== undefined && (typeof dto.reviewNotes !== 'string' || dto.reviewNotes.length > 1500)) throw new BadRequestException('reviewNotes must be text up to 1500 characters');
    const item = await this.captures.findOne(organizationFilter(c, { _id: id }));
    if (!item) throw new NotFoundException('Capture not found in selected organization');
    item.reviewStatus = dto.reviewStatus;
    item.reviewNotes = dto.reviewNotes;
    item.reviewedAt = new Date();
    item.reviewedBy = actorId;
    await item.save();
    return item;
  }
}
