import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile, realpath, stat } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';
import { FieldCapture } from './field-capture.schema';
import { EvidenceAccessEvent } from './evidence-access-event.schema';

const MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_ORG_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;
const ORG_QUOTA_BYTES = Number(process.env.FORESTOS_EVIDENCE_ORG_QUOTA_BYTES || DEFAULT_ORG_QUOTA_BYTES);
const ROOT = resolve(process.env.FORESTOS_EVIDENCE_ROOT || join(process.cwd(), 'private-evidence'));
const TYPES: Record<string, { mime: string; ext: string; signature: (b: Buffer) => boolean }> = {
  jpeg: { mime: 'image/jpeg', ext: '.jpg', signature: b => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  png: { mime: 'image/png', ext: '.png', signature: b => b.length >= 8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  webp: { mime: 'image/webp', ext: '.webp', signature: b => b.length >= 12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP' },
  pdf: { mime: 'application/pdf', ext: '.pdf', signature: b => b.length >= 5 && b.subarray(0,5).toString('ascii')==='%PDF-' },
};

@Injectable()
export class EvidenceStorageService {
  constructor(@InjectModel(FieldCapture.name) private readonly captures: Model<FieldCapture>, @InjectModel(EvidenceAccessEvent.name) private readonly events: Model<EvidenceAccessEvent>) {}

  private async audit(context: any, captureId: string, evidenceId: string, actorId: string, eventType: 'uploaded' | 'downloaded' | 'deleted', outcome: 'success' | 'denied' | 'failed', details: Record<string, unknown> = {}) {
    try { await this.events.create({ organizationId: context.organizationId, captureId, evidenceId, actorId, eventType, outcome, details }); }
    catch (error) { throw new Error('Evidence audit event could not be persisted; operation must be reviewed'); }
  }

  private async capture(raw: OrganizationContext, id: string) {
    const c = requireOrganizationContext(raw);
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Capture not found');
    const capture = await this.captures.findOne(organizationFilter(c, { _id: new Types.ObjectId(id) }));
    if (!capture) throw new NotFoundException('Capture not found in selected organization');
    return { context: c, capture };
  }

  async upload(id: string, file: any, raw: OrganizationContext, actorId: string) {
    if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new BadRequestException('Select a file to upload');
    if (file.buffer.length > MAX_BYTES) throw new BadRequestException('File exceeds the 15 MB limit');
    const detected = Object.values(TYPES).find(t => t.signature(file.buffer));
    if (!detected) throw new BadRequestException('Unsupported or invalid file signature; JPEG, PNG, WebP or PDF only');
    if (file.mimetype && file.mimetype !== detected.mime) throw new BadRequestException('File content does not match its declared MIME type');
    const { context, capture } = await this.capture(raw, id);
    if ((capture.evidenceManifest || []).length >= 10) throw new BadRequestException('A maximum of 10 evidence files is allowed per capture');
    const orgCaptures = await this.captures.find(organizationFilter(context, {})).select({ evidenceManifest: 1 }).lean();
    const usedBytes = orgCaptures.reduce((sum: number, row: any) =>
      sum + (row.evidenceManifest || []).filter((e: any) => !e.deletedAt).reduce((subtotal: number, e: any) => subtotal + (Number(e.sizeBytes) || 0), 0), 0);
    if (!Number.isFinite(ORG_QUOTA_BYTES) || ORG_QUOTA_BYTES <= 0) throw new BadRequestException('Evidence storage quota configuration is invalid');
    if (usedBytes + file.buffer.length > ORG_QUOTA_BYTES) throw new ConflictException('Organization evidence storage quota would be exceeded');
    const evidenceId = randomUUID();
    const safeOrg = context.organizationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = resolve(ROOT, safeOrg);
    if (!dir.startsWith(ROOT + sep)) throw new BadRequestException('Invalid storage scope');
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const fileName = `${evidenceId}${detected.ext}`;
    const fullPath = resolve(dir, fileName);
    if (!fullPath.startsWith(dir + sep)) throw new BadRequestException('Invalid storage path');
    // File bytes are written under a server-generated name, never the client filename.
    await writeFile(fullPath, file.buffer, { flag: 'wx', mode: 0o600 });
    const digest = createHash('sha256').update(file.buffer).digest('hex');
    const item = {
      evidenceId, filename: String(file.originalname || 'evidence').replace(/[\\/\x00-\x1f]/g, '_').slice(0,200),
      mimeType: detected.mime, sizeBytes: file.buffer.length, sha256: digest,
      storageKey: `${safeOrg}/${fileName}`, uploadedAt: new Date().toISOString(), uploadedBy: actorId,
    };
    try {
      const updated = await this.captures.findOneAndUpdate(
        organizationFilter(context, {
          _id: capture._id,
          $expr: { $lt: [{ $size: { $ifNull: ['$evidenceManifest', []] } }, 10] },
        }),
        { $push: { evidenceManifest: item } },
        { new: true },
      );
      if (!updated) throw new ConflictException('Capture evidence limit reached or capture changed; retry after refreshing');
    } catch (error) {
      // Avoid leaving an unreferenced file when metadata persistence fails.
      try { const { unlink } = await import('fs/promises'); await unlink(fullPath); } catch {}
      throw error;
    }
    await this.audit(context, String(capture._id), evidenceId, actorId, 'uploaded', 'success', { sizeBytes: item.sizeBytes, mimeType: item.mimeType });
    return { evidenceId, filename: item.filename, mimeType: item.mimeType, sizeBytes: item.sizeBytes, sha256: item.sha256 };
  }

  async getDownload(id: string, evidenceId: string, raw: OrganizationContext, actorId: string) {
    const { context, capture } = await this.capture(raw, id);
    const item: any = (capture.evidenceManifest || []).find((x: any) => x.evidenceId === evidenceId);
    if (!item || item.deletedAt || typeof item.storageKey !== 'string') throw new NotFoundException('Evidence file not found');
    const safeOrg = context.organizationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const expectedPrefix = `${safeOrg}/`;
    if (!item.storageKey.startsWith(expectedPrefix) || item.storageKey.includes('..')) throw new NotFoundException('Evidence file not found');
    const fullPath = resolve(ROOT, item.storageKey);
    const orgRoot = resolve(ROOT, safeOrg);
    if (!fullPath.startsWith(orgRoot + sep)) throw new NotFoundException('Evidence file not found');
    try {
      const [rootReal, fileReal, info] = await Promise.all([realpath(orgRoot), realpath(fullPath), stat(fullPath)]);
      if (!fileReal.startsWith(rootReal + sep) || !info.isFile() || info.size > MAX_BYTES) throw new NotFoundException('Evidence file not found');
      const bytes = await readFile(fileReal);
      if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new NotFoundException('Evidence integrity check failed');
      await this.audit(context, String(capture._id), evidenceId, actorId, 'downloaded', 'success', { sizeBytes: info.size });
      return { bytes, mimeType: item.mimeType, filename: item.filename };
    } catch (e: any) {
      if (e?.status) throw e;
      throw new NotFoundException('Evidence file is unavailable');
    }
  }

  async deleteEvidence(id: string, evidenceId: string, raw: OrganizationContext, actorId: string) {
    const { context, capture } = await this.capture(raw, id);
    const item: any = (capture.evidenceManifest || []).find((x: any) => x.evidenceId === evidenceId && !x.deletedAt);
    if (!item) throw new NotFoundException('Evidence file not found');
    // Soft-delete keeps the object for controlled recovery/retention handling.
    const now = new Date().toISOString();
    const result = await this.captures.updateOne(
      organizationFilter(context, { _id: capture._id, 'evidenceManifest.evidenceId': evidenceId, 'evidenceManifest.deletedAt': { $exists: false } }),
      { $set: {
        'evidenceManifest.$.deletedAt': now,
        'evidenceManifest.$.deletedBy': actorId,
      } },
    );
    if (!result.modifiedCount) throw new ConflictException('Evidence was already changed or deleted; refresh and retry');
    await this.audit(context, String(capture._id), evidenceId, actorId, 'deleted', 'success', {
      sizeBytes: Number(item.sizeBytes) || 0, filename: String(item.filename || ''), softDelete: true,
    });
    return { deleted: true, recoverable: true, evidenceId, deletedAt: now };
  }

  async governanceSummary(raw: OrganizationContext) {
    const context = requireOrganizationContext(raw);
    const rows = await this.captures.find(organizationFilter(context, {})).select({ _id: 1, evidenceManifest: 1 }).lean();
    const allEvidence = rows.flatMap((capture: any) => (capture.evidenceManifest || []).map((item: any) => ({
      captureId: String(capture._id), evidenceId: String(item.evidenceId || ''),
      sizeBytes: Number(item.sizeBytes) || 0, uploadedAt: item.uploadedAt || null,
      mimeType: item.mimeType || 'unknown', hasStorageKey: typeof item.storageKey === 'string', deletedAt: item.deletedAt || null,
    })));
    const evidence = allEvidence.filter((item: any) => !item.deletedAt);
    const events = await this.events.find({ organizationId: context.organizationId }).sort({ createdAt: -1 }).limit(100).lean();
    return {
      organizationId: context.organizationId,
      evidenceCount: evidence.length,
      softDeletedCount: allEvidence.filter((item: any) => !!item.deletedAt).length,
      quotaBytes: ORG_QUOTA_BYTES,
      quotaRemainingBytes: Math.max(0, ORG_QUOTA_BYTES - evidence.reduce((sum: number, item: any) => sum + item.sizeBytes, 0)),
      totalBytes: evidence.reduce((sum: number, item: any) => sum + item.sizeBytes, 0),
      metadataOnlyCount: evidence.filter((item: any) => !item.hasStorageKey).length,
      recentEvents: events.map((event: any) => ({
        eventType: event.eventType, outcome: event.outcome, captureId: event.captureId,
        evidenceId: event.evidenceId, actorId: event.actorId, createdAt: event.createdAt,
        details: event.details,
      })),
    };
  }

}
