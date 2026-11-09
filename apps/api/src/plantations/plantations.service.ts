import { ConflictException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plantation } from './plantation.schema';
import { CreatePlantationDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { GrowthSample } from '../growth/growth.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

@Injectable()
export class PlantationsService {
  constructor(
    @InjectModel(Plantation.name) private model: Model<Plantation>,
    private audit: AuditService,
    @InjectModel(GrowthSample.name) private growth: Model<GrowthSample>,
  ) {}

  findAll(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.model.find(organizationFilter(context)).sort({ blockId: 1 }).lean();
  }

  async create(dto: CreatePlantationDto, rawContext: OrganizationContext, actorEmail?: string) {
  const context = requireOrganizationContext(rawContext);
  const payload = organizationDocument(context, dto as unknown as Record<string, unknown>);
  let row: any;
  try {
    row = await this.model.create(payload);
  } catch (e: any) {
    if (e?.code === 11000) {
      throw new ConflictException(`Plantation block "${dto.blockId}" already exists in this organization`);
    }
    throw e;
  }
  if (actorEmail) {
    await this.audit.recordForTenant(
      { tenantId: context.organizationId, actorEmail },
      'created', 'plantation', String(row._id),
      `Created plantation block ${row.blockId}`, { organizationId: context.organizationId },
    );
  }
  return row;
}

  async update(id: string, dto: Partial<CreatePlantationDto>, rawContext: OrganizationContext, actorEmail?: string) {
    const context = requireOrganizationContext(rawContext);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plantation id');
    const safeDto: any = { ...dto };
    delete safeDto.organizationId;
    delete safeDto.createdBy;
    const x: any = await this.model.findOneAndUpdate(
      organizationFilter(context, { _id: id }),
      safeDto,
      { new: true, runValidators: true },
    ).lean();
    if (!x) throw new NotFoundException('Plantation block not found');
    if (actorEmail) {
      await this.audit.recordForTenant(
        { tenantId: context.organizationId, actorEmail },
        'updated', 'plantation', String(x._id),
        `Updated plantation block ${x.blockId}`, {
          organizationId: context.organizationId,
          fields: Object.keys(safeDto),
        },
      );
    }
    return x;
  }

  async intelligence(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const blocks: any[] = await this.model.find(organizationFilter(context)).sort({ blockId: 1 }).lean();
    const result = [];
    for (const b of blocks) {
      // Growth samples are joined only for block IDs visible in this organization.
      const samples: any[] = await this.growth.find(organizationFilter(context, { blockId: b.blockId })).sort({ sampleDate: 1 }).lean();
      const latest = samples[samples.length - 1];
      const survival = (b.initialTrees && b.latestLiveTrees !== undefined)
        ? Math.max(0, Math.min(100, Number(b.latestLiveTrees) / Number(b.initialTrees) * 100))
        : null;
      result.push({
        ...b,
        survivalRatePercent: survival,
        treeLossCount: b.initialTrees !== undefined && b.latestLiveTrees !== undefined
          ? Math.max(0, b.initialTrees - b.latestLiveTrees) : null,
        growthSampleCount: samples.length,
        latestGrowthSample: latest ? {
          sampleDate: latest.sampleDate,
          averageHeightM: latest.averageHeightM,
          averageDbhCm: latest.averageDbhCm,
          treeCount: latest.treeCount,
        } : null,
        measurementNote: 'Survival rate uses recorded initial and live tree counts only; growth is a sample measurement, not a timber volume estimate.',
      });
    }
    return {
      generatedAt: new Date().toISOString(),
      organizationId: context.organizationId,
      blocks: result,
      totals: {
        blocks: result.length,
        areaAcres: result.reduce((a, b) => a + Number(b.areaAcres || 0), 0),
        initialTreesRecorded: result.reduce((a, b) => a + Number(b.initialTrees || 0), 0),
        liveTreesRecorded: result.reduce((a, b) => a + Number(b.latestLiveTrees || 0), 0),
        blocksMissingTreeCounts: result.filter(b => b.initialTrees === undefined || b.latestLiveTrees === undefined).length,
      },
      warnings: [
        'Counts and areas are only as reliable as field records.',
        'Do not use sample height/DBH alone to estimate saleable timber without a validated forestry method.',
      ],
    };
  }
}
