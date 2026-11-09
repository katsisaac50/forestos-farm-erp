import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { createReadStream, existsSync, mkdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { VideoEvidence } from './video-evidence.schema';
import { VideoEvidenceMetadataDto, VideoEvidenceReviewDto } from './video-evidence.dto';

const MAX_VIDEO_BYTES = 100_000_000; // 100 MB
const STORAGE_DIR = process.env.VIDEO_STORAGE_DIR || './private-videos';

@Injectable()
export class VideoEvidenceService {
  constructor(
    @InjectModel(VideoEvidence.name) private readonly model: Model<VideoEvidence>
  ) {
    if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });
  }

  private hash(buf: Buffer): string {
    return createHash('sha256').update(buf).digest('hex');
  }

  private async ensureDir() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }

  async upload(file: any, meta: VideoEvidenceMetadataDto, actor: string) {
    if (!file) throw new BadRequestException('Select a video first.');
    if (file.size > MAX_VIDEO_BYTES) throw new BadRequestException('Video exceeds 100 MB.');
    if (!file.mimetype.startsWith('video/')) throw new BadRequestException('Only video files accepted.');

    await this.ensureDir();
    const sha = this.hash(file.buffer);
    const filename = `${Date.now()}-${sha.slice(0, 16)}.${file.originalname.split('.').pop() || 'mp4'}`;
    const storagePath = join(STORAGE_DIR, filename);
    await fs.writeFile(storagePath, file.buffer);

    return this.model.create({
      runId: meta.runId,
      farmBlock: meta.farmBlock,
      uploadedBy: actor,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sha256: sha,
      caption: meta.caption,
      storagePath,
      reviewStatus: 'pending_review',
    });
  }

  async list(actor: string, isOwner: boolean) {
    const q = isOwner ? {} : { uploadedBy: actor };
    return this.model.find(q).sort({ createdAt: -1 }).limit(500).lean();
  }

  async getFile(id: string, actor: string, isOwner: boolean, range?: string) {
    const item = await this.model.findById(id).lean();
    if (!item) throw new NotFoundException('Video not found.');
    if (!isOwner && item.uploadedBy !== actor) throw new NotFoundException('Video not found.');
    if (!existsSync(item.storagePath)) throw new NotFoundException('File missing from storage.');

    const stat = await fs.stat(item.storagePath);
    const fileSize = stat.size;

    if (!range) {
      return { stream: createReadStream(item.storagePath), mimeType: item.mimeType, size: fileSize, range: undefined };
    }

    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) throw new BadRequestException('Invalid Range header.');

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize || start > end)
      throw new BadRequestException('Range not satisfiable.');

    return {
      stream: createReadStream(item.storagePath, { start, end }),
      mimeType: item.mimeType,
      size: fileSize,
      range: { start, end },
    };
  }

  async review(id: string, dto: VideoEvidenceReviewDto, actor: string, approve: boolean) {
  const item = await this.model.findById(id);
  if (!item) throw new NotFoundException('Video not found.');
  if (!dto.reviewNote?.trim()) throw new BadRequestException('Review note required.');
  if (item.reviewStatus !== 'pending_review') {
    throw new BadRequestException('Only pending-review evidence can be reviewed.');
  }
  item.reviewStatus = approve ? 'approved' : 'rejected';
  item.reviewNote = dto.reviewNote.trim();
  item.reviewBy = actor;
  item.reviewedAt = new Date();
  await item.save();
  return item.toObject();
}
}

