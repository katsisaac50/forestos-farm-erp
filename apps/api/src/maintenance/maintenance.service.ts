import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FarmAsset, FarmAssetDocument, MaintenanceRecord, MaintenanceRecordDocument, SparePart, SparePartDocument, ASSET_TYPES, ASSET_STATUSES, MAINTENANCE_TYPES, MAINTENANCE_STATUSES } from './maintenance.schema';
import { MaintenanceGlService } from './maintenance-gl.service';
import { OrganizationContext } from '../organizations/organization-context';

const assetTypes = [...ASSET_TYPES];
const assetStatuses = [...ASSET_STATUSES];
const maintenanceTypes = [...MAINTENANCE_TYPES];
const maintenanceStatuses = [...MAINTENANCE_STATUSES];

function num(v: any, n: string, min = 0) {
  const x = Number(v);
  if (!Number.isFinite(x) || x < min) throw new BadRequestException(`${n} must be a number >= ${min}`);
  return x;
}
function date(v: any, n: string, required = false): string | null {
  if (v === '' || v === undefined || v === null) {
    if (required) throw new BadRequestException(`${n} is required`);
    return null;
  }
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))
    throw new BadRequestException(`${n} must be YYYY-MM-DD`);
  return v;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectModel(FarmAsset.name) private assets: Model<FarmAssetDocument>,
    @InjectModel(MaintenanceRecord.name) private records: Model<MaintenanceRecordDocument>,
    @InjectModel(SparePart.name) private parts: Model<SparePartDocument>,
    private readonly gl: MaintenanceGlService,
  ) {}

  async createAsset(b: any, actor: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.assetCode?.trim() || !b?.name?.trim()) throw new BadRequestException('assetCode and name are required');
    if (!assetTypes.includes(b.assetType)) throw new BadRequestException('Invalid assetType');
    const status = b.status || 'active';
    if (!assetStatuses.includes(status)) throw new BadRequestException('Invalid asset status');

    if (await this.assets.findOne({ organizationId, assetCode: b.assetCode.trim() }).lean())
      throw new BadRequestException('Asset code already exists.');

    const asset: any = await this.assets.create({
      organizationId,
      assetCode: b.assetCode.trim(),
      name: b.name.trim(),
      assetType: b.assetType,
      description: b.description || '',
      location: b.location || '',
      serialNumber: b.serialNumber || '',
      makeModel: b.makeModel || '',
      purchaseDate: date(b.purchaseDate, 'purchaseDate'),
      purchaseCostUgx: num(b.purchaseCostUgx ?? 0, 'purchaseCostUgx'),
      supplier: b.supplier || '',
      assignedTo: b.assignedTo || '',
      status,
      lastServiceDate: date(b.lastServiceDate, 'lastServiceDate'),
      nextServiceDate: date(b.nextServiceDate, 'nextServiceDate'),
      serviceIntervalDays: num(b.serviceIntervalDays ?? 0, 'serviceIntervalDays'),
      notes: b.notes || '',
      createdBy: actor,
    });

    // Post GL if there's a purchase cost
    try {
      const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
      await this.gl.postAssetPurchase(context, asset.toObject());
    } catch (e: any) {
      if (e?.status === 400 && /locked period/i.test(e.message)) {
        await this.assets.findByIdAndDelete(asset._id);
        throw e;
      }
      this.logger.error(`GL post failed for asset ${asset.assetCode}: ${e.message}`, e.stack);
    }

    return asset;
  }

  async updateAsset(id: string, b: any, organizationId: string) {
    const r = await this.assets.findOne({ _id: id, organizationId });
    if (!r) throw new NotFoundException('Asset not found');
    for (const k of ['name','description','location','serialNumber','makeModel','supplier','assignedTo','notes'] as const) {
      if (b[k] !== undefined) (r as any)[k] = b[k];
    }
    if (b.assetType !== undefined) {
      if (!assetTypes.includes(b.assetType)) throw new BadRequestException('Invalid assetType');
      r.assetType = b.assetType;
    }
    if (b.status !== undefined) {
      if (!assetStatuses.includes(b.status)) throw new BadRequestException('Invalid status');
      r.status = b.status;
    }
    for (const k of ['purchaseDate','lastServiceDate','nextServiceDate'] as const) {
      if (b[k] !== undefined) (r as any)[k] = date(b[k], k);
    }
    if (b.purchaseCostUgx !== undefined) r.purchaseCostUgx = num(b.purchaseCostUgx, 'purchaseCostUgx');
    if (b.serviceIntervalDays !== undefined) r.serviceIntervalDays = num(b.serviceIntervalDays, 'serviceIntervalDays');
    await r.save();
    return r;
  }

  listAssets(organizationId: string, q: any = {}) {
    const f: any = { organizationId };
    if (q.status && assetStatuses.includes(q.status)) f.status = q.status;
    if (q.assetType && assetTypes.includes(q.assetType)) f.assetType = q.assetType;
    return this.assets.find(f).sort({ assetCode: 1 }).lean();
  }

  listRecords(organizationId: string, assetId?: string) {
    return this.records
      .find(assetId ? { organizationId, assetId } : { organizationId })
      .sort({ plannedDate: -1 })
      .lean();
  }

  async createRecord(b: any, actor: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.assetId || !b?.maintenanceCode?.trim() || !b?.title?.trim())
      throw new BadRequestException('assetId, maintenanceCode and title are required');
    const asset = await this.assets.findOne({ _id: b.assetId, organizationId });
    if (!asset) throw new NotFoundException('Asset not found');
    if (!maintenanceTypes.includes(b.maintenanceType))
      throw new BadRequestException('Invalid maintenanceType');
    const status = b.status || 'planned';
    if (!maintenanceStatuses.includes(status))
      throw new BadRequestException('Invalid maintenance status');

    const plannedDate = date(b.plannedDate, 'plannedDate', true);
    const suppliedCompletedDate = date(b.completedDate, 'completedDate');
    const completedDate =
      status === 'completed' ? suppliedCompletedDate || new Date().toISOString().slice(0, 10) : suppliedCompletedDate;

    const record: any = await this.records.create({
      organizationId,
      assetId: b.assetId,
      maintenanceCode: b.maintenanceCode.trim(),
      maintenanceType: b.maintenanceType,
      title: b.title.trim(),
      description: b.description || '',
      plannedDate,
      completedDate,
      status,
      assignedTo: b.assignedTo || '',
      labourCostUgx: num(b.labourCostUgx ?? 0, 'labourCostUgx'),
      partsCostUgx: num(b.partsCostUgx ?? 0, 'partsCostUgx'),
      otherCostUgx: num(b.otherCostUgx ?? 0, 'otherCostUgx'),
      partsUsed: b.partsUsed || '',
      notes: b.notes || '',
      createdBy: actor,
    });

    // If created directly in completed state, post GL
    if (status === 'completed') {
      try {
        const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
        await this.gl.postMaintenanceCompletion(context, record.toObject(), asset.toObject());
      } catch (e: any) {
        if (e?.status === 400 && /locked period/i.test(e.message)) {
          await this.records.findByIdAndDelete(record._id);
          throw e;
        }
        this.logger.error(`GL post failed for maintenance ${record.maintenanceCode}: ${e.message}`, e.stack);
      }
    }

    return record;
  }

  async updateRecord(id: string, b: any, actor: string, organizationId: string) {
    const record = await this.records.findOne({ _id: id, organizationId });
    if (!record) throw new NotFoundException('Maintenance record not found');

    const previousStatus = record.status;
    if (b.status !== undefined) {
      if (!maintenanceStatuses.includes(b.status)) throw new BadRequestException('Invalid status');
      record.status = b.status;
      if (b.status === 'completed' && !record.completedDate) {
        record.completedDate = new Date().toISOString().slice(0, 10);
      }
    }
    if (b.completedDate !== undefined) record.completedDate = date(b.completedDate, 'completedDate') || undefined;
    if (b.labourCostUgx !== undefined) record.labourCostUgx = num(b.labourCostUgx, 'labourCostUgx');
    if (b.partsCostUgx !== undefined) record.partsCostUgx = num(b.partsCostUgx, 'partsCostUgx');
    if (b.otherCostUgx !== undefined) record.otherCostUgx = num(b.otherCostUgx, 'otherCostUgx');
    for (const k of ['title','description','assignedTo','partsUsed','notes'] as const) {
      if (b[k] !== undefined) (record as any)[k] = b[k];
    }
    await record.save();

    // Post GL on transition to completed
    if (previousStatus !== 'completed' && record.status === 'completed') {
      const asset = await this.assets.findOne({ _id: record.assetId, organizationId });
      try {
        const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
        await this.gl.postMaintenanceCompletion(context, record.toObject(), asset?.toObject() ?? null);
      } catch (e: any) {
        this.logger.error(`GL post failed for maintenance ${record.maintenanceCode}: ${e.message}`, e.stack);
      }
    }

    return record;
  }

  listParts(organizationId: string) {
    return this.parts.find({ organizationId }).sort({ partCode: 1 }).lean();
  }

  async createPart(b: any, actor: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.partCode?.trim() || !b?.name?.trim())
      throw new BadRequestException('partCode and name are required');
    if (await this.parts.findOne({ organizationId, partCode: b.partCode.trim() }).lean())
      throw new BadRequestException('Part code already exists.');

    const part: any = await this.parts.create({
      organizationId,
      partCode: b.partCode.trim(),
      name: b.name.trim(),
      category: b.category || '',
      unit: b.unit || 'piece',
      quantityOnHand: num(b.quantityOnHand ?? 0, 'quantityOnHand'),
      reorderLevel: num(b.reorderLevel ?? 0, 'reorderLevel'),
      unitCostUgx: num(b.unitCostUgx ?? 0, 'unitCostUgx'),
      storageLocation: b.storageLocation || '',
      supplier: b.supplier || '',
      notes: b.notes || '',
      createdBy: actor,
    });

    // Post initial stock if quantity > 0 and unitCost > 0
    try {
      const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
      await this.gl.postPartStockIncrease(context, part.toObject(), part.quantityOnHand, actor);
    } catch (e: any) {
      this.logger.error(`GL post failed for part ${part.partCode}: ${e.message}`, e.stack);
    }

    return part;
  }

  async adjustPart(id: string, b: any, actor: string, organizationId: string) {
    const p = await this.parts.findOne({ _id: id, organizationId });
    if (!p) throw new NotFoundException('Spare part not found');
    const previousQty = p.quantityOnHand;

    if (b.quantityOnHand !== undefined) p.quantityOnHand = num(b.quantityOnHand, 'quantityOnHand');
    if (b.reorderLevel !== undefined) p.reorderLevel = num(b.reorderLevel, 'reorderLevel');
    if (b.unitCostUgx !== undefined) p.unitCostUgx = num(b.unitCostUgx, 'unitCostUgx');
    for (const k of ['name','category','unit','storageLocation','supplier','notes'] as const) {
      if (b[k] !== undefined) (p as any)[k] = b[k];
    }
    await p.save();

    // Post stock increase
    const increase = p.quantityOnHand - previousQty;
    if (increase > 0) {
      try {
        const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
        await this.gl.postPartStockIncrease(context, p.toObject(), increase, actor);
      } catch (e: any) {
        this.logger.error(`GL post failed for part adjust ${p.partCode}: ${e.message}`, e.stack);
      }
    }

    return p;
  }

  // dashboard() — kept as-is, needs organizationId now
  async dashboard(organizationId: string) {
    const f = { organizationId };
    const [assets, records, parts] = await Promise.all([
      this.assets.find(f).lean(),
      this.records.find(f).lean(),
      this.parts.find(f).lean(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const completedCost = records
      .filter((r: any) => r.status === 'completed')
      .reduce((s: number, r: any) => s + (r.labourCostUgx || 0) + (r.partsCostUgx || 0) + (r.otherCostUgx || 0), 0);
    return {
      totals: {
        assets: assets.length,
        activeAssets: assets.filter((a: any) => a.status === 'active').length,
        needsRepair: assets.filter((a: any) => a.status === 'needs_repair').length,
        overdue: records.filter((r: any) => r.status === 'planned' && r.plannedDate < today).length,
        serviceOverdue: assets.filter((a: any) => a.nextServiceDate && a.nextServiceDate < today).length,
        lowStock: parts.filter((p: any) => p.quantityOnHand <= p.reorderLevel).length,
        completedMaintenanceCostUgx: completedCost,
      },
    };
  }
}