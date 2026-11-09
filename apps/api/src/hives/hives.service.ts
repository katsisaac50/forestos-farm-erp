import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Hive } from './hive.schema';
import { CreateHiveDto } from './dto';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

@Injectable()
export class HivesService {
  constructor(@InjectModel(Hive.name) private model: Model<Hive>) {}

  findAll(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.model.find(organizationFilter(context)).sort({ hiveId: 1 }).lean();
  }

  async create(dto: CreateHiveDto, rawContext: OrganizationContext) {
  const context = requireOrganizationContext(rawContext);
  const payload = organizationDocument(context, dto as unknown as Record<string, unknown>);
  try {
    return await this.model.create(payload);
  } catch (e: any) {
    if (e?.code === 11000) {
      throw new ConflictException(
        `Hive "${(dto as any).hiveId}" already exists in this organization`,
      );
    }
    throw e;
  }
}

  async update(id: string, dto: Partial<CreateHiveDto>, rawContext: OrganizationContext) {
  const context = requireOrganizationContext(rawContext);
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid hive id');
  const safeDto: any = { ...dto };
  delete safeDto.organizationId;
  delete safeDto.createdBy;
  const x = await this.model.findOneAndUpdate(
    organizationFilter(context, { _id: id }),
    safeDto,
    { new: true, runValidators: true },
  ).lean();
  if (!x) throw new NotFoundException('Hive not found');
  return x;
}
}
