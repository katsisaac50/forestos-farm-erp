import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Supplier, SupplierDocument,
  PurchaseRequest, PurchaseRequestDocument,
  PurchaseOrder, PurchaseOrderDocument,
  PurchaseOrderLine, PurchaseOrderLineDocument,
  GoodsReceipt, GoodsReceiptDocument,
  GoodsReceiptLine, GoodsReceiptLineDocument,
} from './procurement.schema';
import { ProcurementGlService } from './procurement-gl.service';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

const supplierStatuses = ['active', 'on_hold', 'inactive'];
const requestStatuses = ['draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled'];
const orderStatuses = ['draft', 'approved', 'part_received', 'received', 'cancelled'];
const receiptStatuses = ['received', 'partial', 'rejected'];

function num(v: any, n: string, min = 0) {
  const x = Number(v);
  if (!Number.isFinite(x) || x < min) throw new BadRequestException(`${n} must be a number >= ${min}`);
  return x;
}

function date(v: any, n: string, required: true): string;
function date(v: any, n: string, required: false): string | null;
function date(v: any, n: string, required = true): string | null {
  if (v === '' || v === undefined || v === null) {
    if (!required) return null;
    throw new BadRequestException(`${n} is required`);
  }
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))
    throw new BadRequestException(`${n} must be YYYY-MM-DD`);
  const [year, month, day] = v.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) throw new BadRequestException(`${n} must be a valid calendar date`);
  return v;
}

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    @InjectModel(Supplier.name) private suppliers: Model<SupplierDocument>,
    @InjectModel(PurchaseRequest.name) private requests: Model<PurchaseRequestDocument>,
    @InjectModel(PurchaseOrder.name) private orders: Model<PurchaseOrderDocument>,
    @InjectModel(PurchaseOrderLine.name) private lines: Model<PurchaseOrderLineDocument>,
    @InjectModel(GoodsReceipt.name) private receipts: Model<GoodsReceiptDocument>,
    @InjectModel(GoodsReceiptLine.name) private receiptLines: Model<GoodsReceiptLineDocument>,
    private readonly gl: ProcurementGlService,
  ) {}

  async dashboard(organizationId: string) {
    const f = { organizationId };
    const [suppliers, requests, orders, lines, receipts] = await Promise.all([
      this.suppliers.find(f).lean(),
      this.requests.find(f).lean(),
      this.orders.find(f).lean(),
      this.lines.find(f).lean(),
      this.receipts.find(f).lean(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const activeOrders = orders.filter(o => !['received', 'cancelled'].includes(o.status));
    const orderValue = orders
      .filter(o => !['cancelled'].includes(o.status))
      .reduce((sum, o) =>
        sum +
        lines.filter(l => l.orderId === String(o._id))
          .reduce((s, l) => s + l.quantityOrdered * l.unitPriceUgx, 0) +
        (o.transportCostUgx || 0) +
        (o.otherCostUgx || 0), 0);
    const overdue = activeOrders.filter(o => o.expectedDate < today);
    return {
      totals: {
        suppliers: suppliers.filter(s => s.status === 'active').length,
        pendingRequests: requests.filter(r => ['submitted', 'approved'].includes(r.status)).length,
        openOrders: activeOrders.length,
        overdueOrders: overdue.length,
        receipts: receipts.length,
        committedOrderValueUgx: orderValue,
      },
      overdueOrders: overdue.slice(0, 10),
      recentOrders: orders.sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate))).slice(0, 10),
    };
  }

  async listSuppliers(q: any = {}, organizationId: string) {
    const f: any = { organizationId };
    if (q.status && supplierStatuses.includes(q.status)) f.status = q.status;
    return this.suppliers.find(f).sort({ name: 1 }).lean();
  }

  async createSupplier(b: any, actor: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.supplierCode?.trim() || !b?.name?.trim())
      throw new BadRequestException('supplierCode and name are required');
    const status = b.status || 'active';
    if (!supplierStatuses.includes(status)) throw new BadRequestException('Invalid supplier status');
    const rating = b.performanceRating === undefined || b.performanceRating === ''
      ? 0 : num(b.performanceRating, 'performanceRating');
    if (rating > 5) throw new BadRequestException('performanceRating must be 0–5');
    return this.suppliers.create({
      organizationId,
      supplierCode: b.supplierCode.trim(),
      name: b.name.trim(),
      contactPerson: b.contactPerson || '',
      phone: b.phone || '',
      email: b.email || '',
      address: b.address || '',
      taxOrRegistrationRef: b.taxOrRegistrationRef || '',
      categories: b.categories || '',
      paymentTerms: b.paymentTerms || '',
      performanceRating: rating,
      status,
      notes: b.notes || '',
      createdBy: actor,
    });
  }

  async updateSupplier(id: string, b: any, organizationId: string) {
    const s = await this.suppliers.findOne({ _id: id, organizationId });
    if (!s) throw new NotFoundException('Supplier not found');
    for (const k of ['name', 'contactPerson', 'phone', 'email', 'address',
                     'taxOrRegistrationRef', 'categories', 'paymentTerms', 'notes'] as const) {
      if (b[k] !== undefined) (s as any)[k] = b[k];
    }
    if (b.status !== undefined) {
      if (!supplierStatuses.includes(b.status)) throw new BadRequestException('Invalid supplier status');
      s.status = b.status;
    }
    if (b.performanceRating !== undefined) {
      const n = num(b.performanceRating, 'performanceRating');
      if (n > 5) throw new BadRequestException('performanceRating must be 0–5');
      s.performanceRating = n;
    }
    await s.save();
    return s;
  }

  async listRequests(organizationId: string) {
    return this.requests.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async createRequest(b: any, actor: string, organizationId: string) {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.requestCode?.trim() || !b?.title?.trim() || !b?.requestedBy?.trim())
      throw new BadRequestException('requestCode, title and requestedBy are required');
    const status = b.status || 'draft';
    if (!requestStatuses.includes(status)) throw new BadRequestException('Invalid request status');
    return this.requests.create({
      organizationId,
      requestCode: b.requestCode.trim(),
      title: b.title.trim(),
      requestedBy: b.requestedBy.trim(),
      neededBy: date(b.neededBy, 'neededBy', true),
      businessLine: b.businessLine || '',
      justification: b.justification || '',
      estimatedTotalUgx: num(b.estimatedTotalUgx ?? 0, 'estimatedTotalUgx'),
      status,
      decisionNote: b.decisionNote || '',
      createdBy: actor,
    });
  }

  async updateRequest(id: string, b: any, organizationId: string) {
    const r = await this.requests.findOne({ _id: id, organizationId });
    if (!r) throw new NotFoundException('Purchase request not found');
    if (b.status !== undefined) {
      if (!requestStatuses.includes(b.status)) throw new BadRequestException('Invalid request status');
      r.status = b.status;
    }
    if (b.decisionNote !== undefined) r.decisionNote = b.decisionNote;
    await r.save();
    return r;
  }

  async listOrders(organizationId: string): Promise<any[]> {
    const f = { organizationId };
    const [orders, lines, receipts] = await Promise.all([
      this.orders.find(f).sort({ orderDate: -1 }).lean(),
      this.lines.find(f).lean(),
      this.receipts.find(f).lean(),
    ]);
    return orders.map(o => ({
      ...o,
      lines: lines.filter(l => l.orderId === String(o._id)),
      receipts: receipts.filter(r => r.orderId === String(o._id)),
      subtotalUgx: lines
        .filter(l => l.orderId === String(o._id))
        .reduce((s, l) => s + l.quantityOrdered * l.unitPriceUgx, 0),
    }));
  }

  async createOrder(b: any, actor: string, organizationId: string): Promise<any> {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.orderCode?.trim() || !b?.supplierId)
      throw new BadRequestException('orderCode and supplierId are required');
    const supplier = await this.suppliers.findOne({ _id: b.supplierId, organizationId });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (supplier.status !== 'active') throw new BadRequestException('Supplier is not active');
    const orderDate = date(b.orderDate, 'orderDate', true);
    const expectedDate = date(b.expectedDate, 'expectedDate', true);
    if (expectedDate < orderDate)
      throw new BadRequestException('Expected date cannot be before order date');
    const items = Array.isArray(b.lines) ? b.lines : [];
    if (!items.length) throw new BadRequestException('At least one order line is required');
    if (b.requestId) {
      const req = await this.requests.findOne({ _id: b.requestId, organizationId });
      if (!req) throw new NotFoundException('Purchase request not found');
      if (!['approved', 'submitted'].includes(req.status))
        throw new BadRequestException('Request must be submitted or approved before conversion');
    }
    const order = await this.orders.create({
      organizationId,
      orderCode: b.orderCode.trim(),
      supplierId: b.supplierId,
      requestId: b.requestId || null,
      orderDate,
      expectedDate,
      status: b.status || 'draft',
      currency: 'UGX',
      transportCostUgx: num(b.transportCostUgx ?? 0, 'transportCostUgx'),
      otherCostUgx: num(b.otherCostUgx ?? 0, 'otherCostUgx'),
      terms: b.terms || '',
      notes: b.notes || '',
      createdBy: actor,
    });
    try {
      for (const l of items) {
        if (!l?.itemName?.trim()) throw new BadRequestException('Every line needs an itemName');
        await this.lines.create({
          organizationId,
          orderId: String(order._id),
          itemName: l.itemName.trim(),
          itemCode: l.itemCode || '',
          quantityOrdered: num(l.quantityOrdered, 'quantityOrdered', 0.001),
          quantityReceived: 0,
          unitPriceUgx: num(l.unitPriceUgx, 'unitPriceUgx'),
          unit: l.unit || 'piece',
          notes: l.notes || '',
        });
      }
      if (b.requestId) await this.requests.findByIdAndUpdate(b.requestId, { $set: { status: 'converted' } });
    } catch (e) {
      await this.orders.findByIdAndDelete(order._id);
      await this.lines.deleteMany({ orderId: String(order._id) });
      throw e;
    }
    return (await this.listOrders(organizationId)).find(o => String(o._id) === String(order._id));
  }

  async updateOrder(id: string, b: any, organizationId: string) {
    const o = await this.orders.findOne({ _id: id, organizationId });
    if (!o) throw new NotFoundException('Purchase order not found');
    if (b.status !== undefined) {
      if (!orderStatuses.includes(b.status)) throw new BadRequestException('Invalid order status');
      if (b.status === 'received') {
        const ls = await this.lines.find({ orderId: id, organizationId }).lean();
        if (ls.some(l => l.quantityReceived < l.quantityOrdered))
          throw new BadRequestException('Cannot mark received while ordered quantities remain outstanding');
      }
      o.status = b.status;
    }
    if (b.expectedDate !== undefined) o.expectedDate = date(b.expectedDate, 'expectedDate', true);
    if (b.notes !== undefined) o.notes = b.notes;
    await o.save();
    return o;
  }

  async listReceipts(orderId: string | undefined, organizationId: string): Promise<any[]> {
    const f: any = { organizationId };
    if (orderId) f.orderId = orderId;
    const [r, ls] = await Promise.all([
      this.receipts.find(f).sort({ receivedDate: -1 }).lean(),
      this.receiptLines.find({ organizationId }).lean(),
    ]);
    return r.map(x => ({ ...x, lines: ls.filter(l => l.receiptId === String(x._id)) }));
  }

  async createReceipt(b: any, actor: string, organizationId: string): Promise<any> {
    if (!organizationId) throw new BadRequestException('X-Organization-Id required');
    if (!b?.orderId || !b?.receiptCode?.trim())
      throw new BadRequestException('orderId and receiptCode are required');
    const order = await this.orders.findOne({ _id: b.orderId, organizationId });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (['cancelled', 'received'].includes(order.status))
      throw new BadRequestException('Cannot receive against a cancelled or fully received order');
    const receivedDate = date(b.receivedDate, 'receivedDate', true);
    const items = Array.isArray(b.lines) ? b.lines : [];
    if (!items.length) throw new BadRequestException('At least one receipt line is required');

    const receipt = await this.receipts.create({
      organizationId,
      orderId: b.orderId,
      receiptCode: b.receiptCode.trim(),
      receivedDate,
      status: b.status || 'received',
      receivedBy: b.receivedBy || '',
      deliveryNoteReference: b.deliveryNoteReference || '',
      notes: b.notes || '',
      createdBy: actor,
    });

    const createdReceiptLines: any[] = [];
    const touchedOrderLines: any[] = [];
    try {
      for (const item of items) {
        const line = await this.lines.findOne({ _id: item.orderLineId, orderId: b.orderId, organizationId });
        if (!line) throw new BadRequestException('Receipt line must reference a line on this purchase order');
        const qty = num(item.quantityReceived, 'quantityReceived', 0.001);
        if (line.quantityReceived + qty > line.quantityOrdered)
          throw new BadRequestException(`Receipt exceeds outstanding quantity for ${line.itemName}`);
        const rl = await this.receiptLines.create({
          organizationId,
          receiptId: String(receipt._id),
          orderLineId: String(line._id),
          quantityReceived: qty,
          condition: item.condition || '',
          notes: item.notes || '',
        });
        createdReceiptLines.push(rl.toObject());
        const prevQty = line.quantityReceived;
        line.quantityReceived += qty;
        await line.save();
        touchedOrderLines.push({ lineId: String(line._id), prevQty });
      }
      const ls = await this.lines.find({ orderId: b.orderId, organizationId }).lean();
      const allReceived = ls.every(l => l.quantityReceived >= l.quantityOrdered);
      const anyReceived = ls.some(l => l.quantityReceived > 0);
      order.status = allReceived ? 'received' : anyReceived ? 'part_received' : 'approved';
      await order.save();
    } catch (e) {
      await this.receipts.findByIdAndDelete(receipt._id);
      await this.receiptLines.deleteMany({ receiptId: String(receipt._id) });
      for (const t of touchedOrderLines) {
        await this.lines.updateOne({ _id: t.lineId }, { $set: { quantityReceived: t.prevQty } });
      }
      throw e;
    }

    // Post to GL
    try {
      const context: OrganizationContext = { organizationId, userId: actor, roles: [] };
      const orderLines = await this.lines.find({ orderId: b.orderId, organizationId }).lean();
      await this.gl.postReceipt(context, receipt.toObject(), createdReceiptLines, orderLines);
    } catch (e: any) {
      if (e?.status === 400 && /locked period/i.test(e.message)) {
        await this.receipts.findByIdAndDelete(receipt._id);
        await this.receiptLines.deleteMany({ receiptId: String(receipt._id) });
        for (const t of touchedOrderLines) {
          await this.lines.updateOne({ _id: t.lineId }, { $set: { quantityReceived: t.prevQty } });
        }
        throw e;
      }
      this.logger.error(`GL post failed for receipt ${receipt.receiptCode}: ${e.message}`, e.stack);
    }

    return (await this.listReceipts(b.orderId, organizationId))
      .find(x => String(x._id) === String(receipt._id));
  }
}