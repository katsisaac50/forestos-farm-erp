
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class ManagementIntelligenceService {
  async dashboard(): Promise<never> {
    throw new ServiceUnavailableException(
      'Management Intelligence dashboard is temporarily unavailable while organization-level data isolation is being implemented.',
    );
  }
}







// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import {
//   Supplier,
//   SupplierDocument,
//   PurchaseRequest,
//   PurchaseRequestDocument,
//   PurchaseOrder,
//   PurchaseOrderDocument,
//   PurchaseOrderLine,
//   PurchaseOrderLineDocument,
//   GoodsReceipt,
//   GoodsReceiptDocument,
//   GoodsReceiptLine,
//   GoodsReceiptLineDocument,
// } from '../procurement/procurement.schema';

// const supplierStatuses = ['active', 'on_hold', 'inactive'];
// const requestStatuses = ['draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled'];
// const orderStatuses = ['draft', 'approved', 'part_received', 'received', 'cancelled'];
// const receiptStatuses = ['received', 'partial', 'rejected'];

// function num(v: any, n: string, min = 0) {
//   const x = Number(v);
//   if (!Number.isFinite(x) || x < min)
//     throw new BadRequestException(`${n} must be a number >= ${min}`);
//   return x;
// }

// function date(v: any, n: string): string;
// function date(v: any, n: string, required: true): string;
// function date(v: any, n: string, required: false): string | null;

// function date(
//   v: any,
//   n: string,
//   required = true,
// ): string | null {
//   if (v === '' || v === undefined || v === null) {
//     if (!required) return null;
//     throw new BadRequestException(`${n} is required`);
//   }

//   if (
//     typeof v !== 'string' ||
//     !/^\d{4}-\d{2}-\d{2}$/.test(v)
//   ) {
//     throw new BadRequestException(`${n} must be YYYY-MM-DD`);
//   }

//   const [year, month, day] = v.split('-').map(Number);
//   const parsed = new Date(Date.UTC(year, month - 1, day));

//   if (
//     Number.isNaN(parsed.getTime()) ||
//     parsed.getUTCFullYear() !== year ||
//     parsed.getUTCMonth() !== month - 1 ||
//     parsed.getUTCDate() !== day
//   ) {
//     throw new BadRequestException(`${n} must be a valid calendar date`);
//   }

//   return v;
// }


// @Injectable()
// export class ProcurementService {
//   constructor(
//     @InjectModel(Supplier.name) private suppliers: Model<SupplierDocument>,
//     @InjectModel(PurchaseRequest.name) private requests: Model<PurchaseRequestDocument>,
//     @InjectModel(PurchaseOrder.name) private orders: Model<PurchaseOrderDocument>,
//     @InjectModel(PurchaseOrderLine.name) private lines: Model<PurchaseOrderLineDocument>,
//     @InjectModel(GoodsReceipt.name) private receipts: Model<GoodsReceiptDocument>,
//     @InjectModel(GoodsReceiptLine.name) private receiptLines: Model<GoodsReceiptLineDocument>,
//   ) {}

//   async dashboard() {
//     const [suppliers, requests, orders, lines, receipts] = await Promise.all([
//       this.suppliers.find().lean(),
//       this.requests.find().lean(),
//       this.orders.find().lean(),
//       this.lines.find().lean(),
//       this.receipts.find().lean(),
//     ]);
//     const today = new Date().toISOString().slice(0, 10);
//     const activeOrders = orders.filter((o) => !['received', 'cancelled'].includes(o.status));
//     const orderValue = orders
//       .filter((o) => !['cancelled'].includes(o.status))
//       .reduce(
//         (sum, o) =>
//           sum +
//           lines
//             .filter((l) => l.orderId === String(o._id))
//             .reduce((s, l) => s + l.quantityOrdered * l.unitPriceUgx, 0) +
//           (o.transportCostUgx || 0) +
//           (o.otherCostUgx || 0),
//         0,
//       );
//     const overdue = activeOrders.filter((o) => o.expectedDate < today);
//     return {
//       totals: {
//         suppliers: suppliers.filter((s) => s.status === 'active').length,
//         pendingRequests: requests.filter((r) => ['submitted', 'approved'].includes(r.status)).length,
//         openOrders: activeOrders.length,
//         overdueOrders: overdue.length,
//         receipts: receipts.length,
//         committedOrderValueUgx: orderValue,
//       },
//       overdueOrders: overdue.slice(0, 10),
//       recentOrders: orders
//         .sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)))
//         .slice(0, 10),
//     };
//   }

//   async listSuppliers(q: any = {}) {
//     const f: any = {};
//     if (q.status && supplierStatuses.includes(q.status)) f.status = q.status;
//     return this.suppliers.find(f).sort({ name: 1 }).lean();
//   }

//   async createSupplier(b: any, actor = '') {
//     if (!b?.supplierCode?.trim() || !b?.name?.trim())
//       throw new BadRequestException('supplierCode and name are required');
//     const status = b.status || 'active';
//     if (!supplierStatuses.includes(status)) throw new BadRequestException('Invalid supplier status');
//     const rating =
//       b.performanceRating === undefined || b.performanceRating === ''
//         ? 0
//         : num(b.performanceRating, 'performanceRating');
//     if (rating > 5) throw new BadRequestException('performanceRating must be 0–5');
//     return this.suppliers.create({
//       supplierCode: b.supplierCode.trim(),
//       name: b.name.trim(),
//       contactPerson: b.contactPerson || '',
//       phone: b.phone || '',
//       email: b.email || '',
//       address: b.address || '',
//       taxOrRegistrationRef: b.taxOrRegistrationRef || '',
//       categories: b.categories || '',
//       paymentTerms: b.paymentTerms || '',
//       performanceRating: rating,
//       status,
//       notes: b.notes || '',
//       createdBy: actor,
//     });
//   }

//   async updateSupplier(id: string, b: any) {
//     const s = await this.suppliers.findById(id);
//     if (!s) throw new NotFoundException('Supplier not found');
//     for (const k of [
//       'name',
//       'contactPerson',
//       'phone',
//       'email',
//       'address',
//       'taxOrRegistrationRef',
//       'categories',
//       'paymentTerms',
//       'notes',
//     ] as const)
//       if (b[k] !== undefined) (s as any)[k] = b[k];
//     if (b.status !== undefined) {
//       if (!supplierStatuses.includes(b.status))
//         throw new BadRequestException('Invalid supplier status');
//       s.status = b.status;
//     }
//     if (b.performanceRating !== undefined) {
//       const n = num(b.performanceRating, 'performanceRating');
//       if (n > 5) throw new BadRequestException('performanceRating must be 0–5');
//       s.performanceRating = n;
//     }
//     await s.save();
//     return s;
//   }

//   async listRequests() {
//     return this.requests.find().sort({ createdAt: -1 }).lean();
//   }

//   async createRequest(b: any, actor = '') {
//     if (!b?.requestCode?.trim() || !b?.title?.trim() || !b?.requestedBy?.trim())
//       throw new BadRequestException('requestCode, title and requestedBy are required');
//     const status = b.status || 'draft';
//     if (!requestStatuses.includes(status)) throw new BadRequestException('Invalid request status');
//     return this.requests.create({
//       requestCode: b.requestCode.trim(),
//       title: b.title.trim(),
//       requestedBy: b.requestedBy.trim(),
//       neededBy: date(b.neededBy, 'neededBy'),
//       businessLine: b.businessLine || '',
//       justification: b.justification || '',
//       estimatedTotalUgx: num(b.estimatedTotalUgx ?? 0, 'estimatedTotalUgx'),
//       status,
//       decisionNote: b.decisionNote || '',
//       createdBy: actor,
//     });
//   }

//   async updateRequest(id: string, b: any) {
//     const r = await this.requests.findById(id);
//     if (!r) throw new NotFoundException('Purchase request not found');
//     if (b.status !== undefined) {
//       if (!requestStatuses.includes(b.status))
//         throw new BadRequestException('Invalid request status');
//       r.status = b.status;
//     }
//     if (b.decisionNote !== undefined) r.decisionNote = b.decisionNote;
//     await r.save();
//     return r;
//   }

//   // ---- TS7056 fix #1: explicit return type ----
//   async listOrders(): Promise<any[]> {
//     const [orders, lines, receipts] = await Promise.all([
//       this.orders.find().sort({ orderDate: -1 }).lean(),
//       this.lines.find().lean(),
//       this.receipts.find().lean(),
//     ]);
//     return orders.map((o) => ({
//       ...o,
//       lines: lines.filter((l) => l.orderId === String(o._id)),
//       receipts: receipts.filter((r) => r.orderId === String(o._id)),
//       subtotalUgx: lines
//         .filter((l) => l.orderId === String(o._id))
//         .reduce((s, l) => s + l.quantityOrdered * l.unitPriceUgx, 0),
//     }));
//   }

//   // ---- TS7056 fix #2: explicit return type ----
//   async createOrder(b: any, actor = ''): Promise<any> {
//     if (!b?.orderCode?.trim() || !b?.supplierId)
//       throw new BadRequestException('orderCode and supplierId are required');
//     const supplier = await this.suppliers.findById(b.supplierId);
//     if (!supplier) throw new NotFoundException('Supplier not found');
//     if (supplier.status !== 'active') throw new BadRequestException('Supplier is not active');
//     const orderDate = date(b.orderDate, 'orderDate');
//     const expectedDate = date(b.expectedDate, 'expectedDate');
//     if (expectedDate < orderDate)
//       throw new BadRequestException('Expected date cannot be before order date');
//     const items = Array.isArray(b.lines) ? b.lines : [];
//     if (!items.length) throw new BadRequestException('At least one order line is required');
//     if (b.requestId) {
//       const req = await this.requests.findById(b.requestId);
//       if (!req) throw new NotFoundException('Purchase request not found');
//       if (!['approved', 'submitted'].includes(req.status))
//         throw new BadRequestException(
//           'Request must be submitted or approved before conversion',
//         );
//     }
//     const order = await this.orders.create({
//       orderCode: b.orderCode.trim(),
//       supplierId: b.supplierId,
//       requestId: b.requestId || null,
//       orderDate,
//       expectedDate,
//       status: b.status || 'draft',
//       currency: 'UGX',
//       transportCostUgx: num(b.transportCostUgx ?? 0, 'transportCostUgx'),
//       otherCostUgx: num(b.otherCostUgx ?? 0, 'otherCostUgx'),
//       terms: b.terms || '',
//       notes: b.notes || '',
//       createdBy: actor,
//     });
//     try {
//       for (const l of items) {
//         if (!l?.itemName?.trim())
//           throw new BadRequestException('Every line needs an itemName');
//         await this.lines.create({
//           orderId: String(order._id),
//           itemName: l.itemName.trim(),
//           itemCode: l.itemCode || '',
//           quantityOrdered: num(l.quantityOrdered, 'quantityOrdered', 0.001),
//           quantityReceived: 0,
//           unitPriceUgx: num(l.unitPriceUgx, 'unitPriceUgx'),
//           unit: l.unit || 'piece',
//           notes: l.notes || '',
//         });
//       }
//       if (b.requestId) await this.requests.findByIdAndUpdate(b.requestId, { $set: { status: 'converted' } });
//     } catch (e) {
//       await this.orders.findByIdAndDelete(order._id);
//       await this.lines.deleteMany({ orderId: String(order._id) });
//       throw e;
//     }
//     return (await this.listOrders()).find((o) => String(o._id) === String(order._id));
//   }

//   async updateOrder(id: string, b: any) {
//     const o = await this.orders.findById(id);
//     if (!o) throw new NotFoundException('Purchase order not found');
//     if (b.status !== undefined) {
//       if (!orderStatuses.includes(b.status))
//         throw new BadRequestException('Invalid order status');
//       if (b.status === 'received') {
//         const ls = await this.lines.find({ orderId: id }).lean();
//         if (ls.some((l) => l.quantityReceived < l.quantityOrdered))
//           throw new BadRequestException(
//             'Cannot mark received while ordered quantities remain outstanding',
//           );
//       }
//       o.status = b.status;
//     }
//     if (b.expectedDate !== undefined) {
//   o.expectedDate = date(b.expectedDate, 'expectedDate');
// };
//     if (b.notes !== undefined) o.notes = b.notes;
//     await o.save();
//     return o;
//   }

//   // ---- TS7056 fix #3: explicit return type ----
//   async listReceipts(orderId?: string): Promise<any[]> {
//     const f = orderId ? { orderId } : {};
//     const [r, ls] = await Promise.all([
//       this.receipts.find(f).sort({ receivedDate: -1 }).lean(),
//       this.receiptLines.find().lean(),
//     ]);
//     return r.map((x) => ({
//       ...x,
//       lines: ls.filter((l) => l.receiptId === String(x._id)),
//     }));
//   }

//   // ---- TS7056 fix #4: explicit return type ----
//   async createReceipt(b: any, actor = ''): Promise<any> {
//     if (!b?.orderId || !b?.receiptCode?.trim())
//       throw new BadRequestException('orderId and receiptCode are required');
//     const order = await this.orders.findById(b.orderId);
//     if (!order) throw new NotFoundException('Purchase order not found');
//     if (['cancelled', 'received'].includes(order.status))
//       throw new BadRequestException(
//         'Cannot receive against a cancelled or fully received order',
//       );
//     const receivedDate = date(b.receivedDate, 'receivedDate');
//     const items = Array.isArray(b.lines) ? b.lines : [];
//     if (!items.length) throw new BadRequestException('At least one receipt line is required');
//     const receipt = await this.receipts.create({
//       orderId: b.orderId,
//       receiptCode: b.receiptCode.trim(),
//       receivedDate,
//       status: b.status || 'received',
//       receivedBy: b.receivedBy || '',
//       deliveryNoteReference: b.deliveryNoteReference || '',
//       notes: b.notes || '',
//       createdBy: actor,
//     });
//     try {
//       for (const item of items) {
//         const line = await this.lines.findOne({ _id: item.orderLineId, orderId: b.orderId });
//         if (!line)
//           throw new BadRequestException(
//             'Receipt line must reference a line on this purchase order',
//           );
//         const qty = num(item.quantityReceived, 'quantityReceived', 0.001);
//         if (line.quantityReceived + qty > line.quantityOrdered)
//           throw new BadRequestException(
//             `Receipt exceeds outstanding quantity for ${line.itemName}`,
//           );
//         await this.receiptLines.create({
//           receiptId: String(receipt._id),
//           orderLineId: String(line._id),
//           quantityReceived: qty,
//           condition: item.condition || '',
//           notes: item.notes || '',
//         });
//         line.quantityReceived += qty;
//         await line.save();
//       }
//       const ls = await this.lines.find({ orderId: b.orderId }).lean();
//       const allReceived = ls.every((l) => l.quantityReceived >= l.quantityOrdered);
//       const anyReceived = ls.some((l) => l.quantityReceived > 0);
//       order.status = allReceived ? 'received' : anyReceived ? 'part_received' : 'approved';
//       await order.save();
//     } catch (e) {
//       await this.receipts.findByIdAndDelete(receipt._id);
//       await this.receiptLines.deleteMany({ receiptId: String(receipt._id) });
//       throw e;
//     }
//     return (await this.listReceipts(b.orderId)).find(
//       (x) => String(x._id) === String(receipt._id),
//     );
//   }
// }