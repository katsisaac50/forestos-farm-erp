import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StockItem, StockItemDocument, StockMovement, StockMovementDocument } from './inventory.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

const categories = ['seedlings','spare_parts','fuel','tools','beekeeping','fertiliser','safety','packaging','other'];
const types = ['opening_balance','receipt','issue','return','adjustment_increase','adjustment_decrease','write_off'];
function num(v: any, n: string, min = 0) {
  const x = Number(v);
  if (!Number.isFinite(x) || x < min) throw new BadRequestException(`${n} must be a number >= ${min}`);
  return x;
}
function date(v: any) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    throw new BadRequestException('movementDate must be YYYY-MM-DD');
  }
  return v;
}

@Injectable()
export class InventoryControlService {
  constructor(
    @InjectModel(StockItem.name) private items: Model<StockItemDocument>,
    @InjectModel(StockMovement.name) private moves: Model<StockMovementDocument>,
  ) {}

  async dashboard(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const itemFilter = organizationFilter(context);
    const movementFilter = organizationFilter(context);
    const [items, moves, movementCount] = await Promise.all([
      this.items.find(itemFilter).lean(),
      this.moves.find(movementFilter).sort({ createdAt: -1 }).limit(10).lean(),
      this.moves.countDocuments(movementFilter),
    ]);
    const low = items.filter(i => i.quantityOnHand <= i.reorderLevel);
    return {
      organizationId: context.organizationId,
      totals: {
        items: items.length,
        lowStock: low.length,
        stockValueUgx: items.reduce((s, i) => s + i.quantityOnHand * i.averageUnitCostUgx, 0),
        movementCount,
      },
      lowStock: low,
      recentMovements: moves,
    };
  }

  async listItems(rawContext: OrganizationContext, q: any = {}) {
    const context = requireOrganizationContext(rawContext);
    const f: any = organizationFilter(context);
    if (q.category && categories.includes(q.category)) f.category = q.category;
    if (q.lowStock === 'true') f.$expr = { $lte: ['$quantityOnHand', '$reorderLevel'] };
    return this.items.find(f).sort({ name: 1 }).lean();
  }

  async createItem(rawContext: OrganizationContext, b: any, actor = '') {
    const context = requireOrganizationContext(rawContext);
    if (!b?.itemCode?.trim() || !b?.name?.trim()) throw new BadRequestException('itemCode and name are required');
    if (!categories.includes(b.category)) throw new BadRequestException('Invalid category');
    const quantity = num(b.quantityOnHand ?? 0, 'quantityOnHand');
    const cost = num(b.averageUnitCostUgx ?? 0, 'averageUnitCostUgx');
    const payload = organizationDocument(context, {
      itemCode: b.itemCode.trim(),
      name: b.name.trim(),
      category: b.category,
      unit: b.unit || 'piece',
      quantityOnHand: 0,
      reorderLevel: num(b.reorderLevel ?? 0, 'reorderLevel'),
      averageUnitCostUgx: cost,
      storageLocation: b.storageLocation || '',
      supplier: b.supplier || '',
      linkedAssetCode: b.linkedAssetCode || '',
      notes: b.notes || '',
    });
    const item = await this.items.create({ ...payload, createdBy: actor || context.userId });
    if (quantity > 0) {
      await this.postMovement(context, {
        itemId: String(item._id),
        movementCode: `OPEN-${item.itemCode}`,
        movementType: 'opening_balance',
        movementDate: new Date().toISOString().slice(0, 10),
        quantity,
        unitCostUgx: cost,
        referenceType: 'opening_balance',
        referenceCode: item.itemCode,
        reason: 'Initial stock entry',
      }, actor);
    }
    return this.items.findOne(organizationFilter(context, { _id: item._id })).lean();
  }

  async updateItem(rawContext: OrganizationContext, id: string, b: any) {
    const context = requireOrganizationContext(rawContext);
    const item: any = await this.items.findOne(organizationFilter(context, { _id: id }));
    if (!item) throw new NotFoundException('Stock item not found');
    for (const k of ['name', 'unit', 'storageLocation', 'supplier', 'linkedAssetCode', 'notes'] as const) {
      if (b[k] !== undefined) item[k] = b[k];
    }
    if (b.category !== undefined) {
      if (!categories.includes(b.category)) throw new BadRequestException('Invalid category');
      item.category = b.category;
    }
    if (b.reorderLevel !== undefined) item.reorderLevel = num(b.reorderLevel, 'reorderLevel');
    if (b.averageUnitCostUgx !== undefined) item.averageUnitCostUgx = num(b.averageUnitCostUgx, 'averageUnitCostUgx');
    await item.save();
    return item;
  }

  async listMovements(rawContext: OrganizationContext, itemId?: string) {
    const context = requireOrganizationContext(rawContext);
    const filter: any = organizationFilter(context);
    if (itemId) {
      const parent = await this.items.findOne(organizationFilter(context, { _id: itemId })).select({ _id: 1 }).lean();
      if (!parent) throw new NotFoundException('Stock item not found');
      filter.itemId = itemId;
    }
    return this.moves.find(filter).sort({ movementDate: -1, createdAt: -1 }).limit(500).lean();
  }

  async findMovementByCode(rawContext: OrganizationContext, code: string) {
    const context = requireOrganizationContext(rawContext);
    return this.moves.findOne(organizationFilter(context, { movementCode: code })).lean();
  }

  async postMovement(rawContext: OrganizationContext, b: any, actor = '') {
    const context = requireOrganizationContext(rawContext);
    if (!b?.itemId || !b?.movementCode?.trim()) throw new BadRequestException('itemId and movementCode are required');
    if (!types.includes(b.movementType)) throw new BadRequestException('Invalid movementType');
    const item: any = await this.items.findOne(organizationFilter(context, { _id: b.itemId }));
    if (!item) throw new NotFoundException('Stock item not found');
    const quantity = num(b.quantity, 'quantity', 0.001);
    const unitCost = num(b.unitCostUgx ?? item.averageUnitCostUgx, 'unitCostUgx');
    const movementDate = date(b.movementDate);
    let delta = quantity;
    if (['issue', 'adjustment_decrease', 'write_off'].includes(b.movementType)) delta = -quantity;
    const next = item.quantityOnHand + delta;
    if (next < 0) throw new BadRequestException(`Insufficient stock: available ${item.quantityOnHand} ${item.unit}`);
    const prior = item.quantityOnHand;
    const priorCost = item.averageUnitCostUgx;
    if (['receipt', 'return', 'opening_balance', 'adjustment_increase'].includes(b.movementType) && next > 0) {
      item.averageUnitCostUgx = prior + quantity > 0
        ? ((prior * priorCost) + (quantity * unitCost)) / (prior + quantity)
        : unitCost;
    }
    item.quantityOnHand = next;
    await item.save();
    try {
      return await this.moves.create(organizationDocument(context, {
        itemId: String(item._id),
        movementCode: b.movementCode.trim(),
        movementType: b.movementType,
        movementDate,
        quantity,
        unitCostUgx: unitCost,
        balanceAfter: next,
        referenceType: b.referenceType || '',
        referenceCode: b.referenceCode || '',
        destinationOrSource: b.destinationOrSource || '',
        reason: b.reason || '',
        notes: b.notes || '',
      }));
    } catch (e) {
      item.quantityOnHand = prior;
      item.averageUnitCostUgx = priorCost;
      await item.save();
      throw e;
    }
  }
}
