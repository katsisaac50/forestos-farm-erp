import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';
import { Hive } from '../hives/hive.schema';
import { ApiaryInspection, HoneyHarvest } from './apiary-operation.schema';

@Injectable()
export class ApiaryOperationsService {
  constructor(
    @InjectModel(ApiaryInspection.name) private inspections: Model<ApiaryInspection>,
    @InjectModel(HoneyHarvest.name) private harvests: Model<HoneyHarvest>,
    @InjectModel(Hive.name) private hives: Model<Hive>,
  ) {}

  private async assertHive(context: OrganizationContext, hiveId: string) {
    const hive = await this.hives.findOne(organizationFilter(context, { hiveId })).lean();
    if (!hive) throw new NotFoundException('Hive not found in the selected organization');
    return hive;
  }

  async listInspections(rawContext: OrganizationContext, hiveId?: string) {
    const context = requireOrganizationContext(rawContext);
    if (hiveId) await this.assertHive(context, hiveId);
    return this.inspections.find(organizationFilter(context, hiveId ? { hiveId } : {}))
      .sort({ inspectionDate: -1 }).limit(1000).lean();
  }

  async createInspection(dto: any, rawContext: OrganizationContext, actor: string) {
    const context = requireOrganizationContext(rawContext);
    if (!dto.hiveId || !dto.inspectionDate) throw new BadRequestException('hiveId and inspectionDate are required');
    await this.assertHive(context, dto.hiveId);
    const payload = organizationDocument(context, {
      ...dto,
      inspectedBy: dto.inspectedBy || actor,
    } as Record<string, unknown>);
    return this.inspections.create(payload);
  }

  async listHarvests(rawContext: OrganizationContext, hiveId?: string) {
    const context = requireOrganizationContext(rawContext);
    if (hiveId) await this.assertHive(context, hiveId);
    return this.harvests.find(organizationFilter(context, hiveId ? { hiveId } : {}))
      .sort({ harvestDate: -1 }).limit(1000).lean();
  }

  async createHarvest(dto: any, rawContext: OrganizationContext, actor: string) {
    const context = requireOrganizationContext(rawContext);
    if (!dto.hiveId || !dto.harvestDate || dto.quantityKg === undefined) {
      throw new BadRequestException('hiveId, harvestDate and quantityKg are required');
    }
    if (!Number.isFinite(Number(dto.quantityKg)) || Number(dto.quantityKg) < 0) {
      throw new BadRequestException('quantityKg must be a non-negative number');
    }
    if (dto.moisturePercent !== undefined && dto.moisturePercent !== null &&
      (!Number.isFinite(Number(dto.moisturePercent)) || Number(dto.moisturePercent) < 0 || Number(dto.moisturePercent) > 100)) {
      throw new BadRequestException('moisturePercent must be between 0 and 100');
    }
    await this.assertHive(context, dto.hiveId);
    const payload = organizationDocument(context, {
      ...dto,
      quantityKg: Number(dto.quantityKg),
      harvestedBy: dto.harvestedBy || actor,
    } as Record<string, unknown>);
    return this.harvests.create(payload);
  }

  async summary(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const rows: any[] = await this.harvests.find(organizationFilter(context)).lean();
    const totalKg = rows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
    const byHive = new Map<string, number>();
    for (const row of rows) byHive.set(row.hiveId, (byHive.get(row.hiveId) || 0) + Number(row.quantityKg || 0));
    return {
      organizationId: context.organizationId,
      generatedAt: new Date().toISOString(),
      harvestRecords: rows.length,
      totalHoneyKg: Math.round(totalKg * 100) / 100,
      hivesWithHarvests: byHive.size,
      byHive: [...byHive.entries()].map(([hiveId, quantityKg]) => ({
        hiveId, quantityKg: Math.round(quantityKg * 100) / 100,
      })).sort((a, b) => a.hiveId.localeCompare(b.hiveId)),
      note: 'Summary uses recorded harvest quantities only; it does not estimate unrecorded production or sales revenue.',
    };
  }
}
