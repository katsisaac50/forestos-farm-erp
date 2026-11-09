import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNavigationTargetDto } from './dto';
import { FieldNavigationRecord, FieldNavigationDocument } from './field-navigation.schema';

@Injectable()
export class FieldNavigationService {
  constructor(
    @InjectModel(FieldNavigationRecord.name)
    private readonly model: Model<FieldNavigationDocument>,
  ) {}

  async create(dto: CreateNavigationTargetDto, actor: string) {
    if (!Number.isFinite(dto.latitude) || dto.latitude < -90 || dto.latitude > 90 ||
        !Number.isFinite(dto.longitude) || dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Latitude or longitude is outside valid ranges.');
    }
    return this.model.create({
      ...dto,
      title: dto.title.trim(),
      targetLabel: dto.targetLabel.trim(),
      blockCode: dto.blockCode?.trim() || undefined,
      instructions: dto.instructions?.trim() || undefined,
      createdBy: actor,
      status: 'active',
    });
  }

  async list() {
    return this.model.find({ status: 'active' }).sort({ createdAt: -1 }).limit(1000).lean();
  }

  async archive(id: string) {
    const item = await this.model.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).lean();
    if (!item) throw new NotFoundException('Navigation target not found.');
    return item;
  }
}
