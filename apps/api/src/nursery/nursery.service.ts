import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { NurseryBatch, NurseryMovement } from './nursery.schema';

@Injectable()
export class NurseryService {
  constructor(
    @InjectModel(NurseryBatch.name) private batches: Model<NurseryBatch>,
    @InjectModel(NurseryMovement.name) private movements: Model<NurseryMovement>,
    private audit: AuditService,
  ) {}

  async listBatches() {
    const batches: any[] = await this.batches.find().sort({ startDate: -1 }).lean();
    return batches.map(b => ({ ...b, estimatedStockValueUgx: b.unitCostUgx == null ? null : Number(b.currentQuantity || 0) * Number(b.unitCostUgx) }));
  }

  async createBatch(dto: any, user: any) {
    if (!dto.batchCode || !dto.speciesOrClone || !dto.startDate || dto.initialQuantity === undefined || !dto.propagationType) throw new BadRequestException('Batch code, species/clone, start date, initial quantity and propagation type are required.');
    const initial = Number(dto.initialQuantity);
    if (!Number.isInteger(initial) || initial < 0) throw new BadRequestException('Initial quantity must be a non-negative whole number.');
    const unitCost = dto.unitCostUgx === '' || dto.unitCostUgx == null ? undefined : Number(dto.unitCostUgx);
    if (unitCost !== undefined && (!Number.isFinite(unitCost) || unitCost < 0)) throw new BadRequestException('Unit cost must be non-negative.');
    const existing = await this.batches.findOne({ batchCode: dto.batchCode }).lean();
    if (existing) throw new BadRequestException('Batch code already exists.');
    const row: any = await this.batches.create({ ...dto, initialQuantity: initial, currentQuantity: initial, unitCostUgx: unitCost, createdBy: user.email });
    await this.movements.create({ batchId: String(row._id), movementType: 'production_added', quantity: initial, movementDate: dto.startDate, reason: 'Opening batch quantity', recordedBy: user.email });
    await this.audit.record(user.email, 'created', 'nursery_batch', String(row._id), `Created nursery batch ${row.batchCode}`, { initialQuantity: initial });
    return row;
  }

  async addMovement(dto: any, user: any) {
    const allowed = ['production_added','loss','dispatch','adjustment_in','adjustment_out'];
    if (!dto.batchId || !allowed.includes(dto.movementType) || dto.quantity === undefined || !dto.movementDate) throw new BadRequestException('Batch, movement type, quantity and date are required.');
    const quantity = Number(dto.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new BadRequestException('Movement quantity must be a positive whole number.');
    const batch: any = await this.batches.findById(dto.batchId).lean();
    if (!batch) throw new NotFoundException('Nursery batch not found.');
    const increases = ['production_added','adjustment_in'].includes(dto.movementType);
    const nextQuantity = Number(batch.currentQuantity || 0) + (increases ? quantity : -quantity);
    if (nextQuantity < 0) throw new BadRequestException('Movement would make nursery stock negative.');
    if (dto.movementType === 'dispatch' && !dto.plantationBlockId) throw new BadRequestException('Dispatch must name the destination plantation block.');
    const movement: any = await this.movements.create({ ...dto, quantity, recordedBy: user.email });
    await this.batches.findByIdAndUpdate(dto.batchId, { currentQuantity: nextQuantity, status: nextQuantity === 0 ? (dto.movementType === 'dispatch' ? 'dispatched' : 'closed') : (dto.movementType === 'dispatch' ? 'partially_dispatched' : batch.status) });
    await this.audit.record(user.email, 'created', 'nursery_movement', String(movement._id), `Recorded nursery ${dto.movementType} movement`, { batchId: dto.batchId, quantity, resultingStock: nextQuantity });
    return { movement, resultingStock: nextQuantity };
  }

  async listMovements(batchId?: string) {
    return this.movements.find(batchId ? { batchId } : {}).sort({ movementDate: -1 }).lean();
  }

  async dashboard() {
    const batches: any[] = await this.batches.find().lean();
    const movements: any[] = await this.movements.find().sort({ movementDate: -1 }).lean();
    const stock = batches.reduce((sum, b) => sum + Number(b.currentQuantity || 0), 0);
    const batchesWithCost = batches.filter(b => b.unitCostUgx != null);
    const stockValue = batchesWithCost.reduce((sum, b) => sum + Number(b.currentQuantity || 0) * Number(b.unitCostUgx || 0), 0);
    const dispatched = movements.filter(m => m.movementType === 'dispatch').reduce((sum,m) => sum + Number(m.quantity || 0),0);
    const losses = movements.filter(m => m.movementType === 'loss').reduce((sum,m) => sum + Number(m.quantity || 0),0);
    return {
      generatedAt: new Date().toISOString(),
      totals: { batchCount: batches.length, currentSeedlingStock: stock, batchesWithUnitCost: batchesWithCost.length, estimatedStockValueUgx: batchesWithCost.length ? stockValue : null, dispatchedQuantityRecorded: dispatched, lossesRecorded: losses },
      batches: batches.map(b => ({ ...b, estimatedStockValueUgx: b.unitCostUgx == null ? null : Number(b.currentQuantity || 0) * Number(b.unitCostUgx) })),
      recentMovements: movements.slice(0, 30),
      warnings: ['Stock depends on correctly recorded movements and is not a physical count.', 'Estimated stock value uses the entered unit cost, not a verified accounting valuation.', 'Dispatch quantity is a movement total, not proof of seedling survival after planting.'],
    };
  }
}
