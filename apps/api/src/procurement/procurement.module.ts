import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import {
  Supplier, SupplierSchema,
  PurchaseRequest, PurchaseRequestSchema,
  PurchaseOrder, PurchaseOrderSchema,
  PurchaseOrderLine, PurchaseOrderLineSchema,
  GoodsReceipt, GoodsReceiptSchema,
  GoodsReceiptLine, GoodsReceiptLineSchema,
} from './procurement.schema';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { ProcurementGlService } from './procurement-gl.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseOrderLine.name, schema: PurchaseOrderLineSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: GoodsReceiptLine.name, schema: GoodsReceiptLineSchema },
    ]),
    AccountingModule,
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService, ProcurementGlService],
})
export class ProcurementModule {}