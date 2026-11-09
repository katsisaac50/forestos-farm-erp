import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { SalesOrder, SalesOrderSchema } from '../sales/sales.schema';
import { InventoryItem, InventoryItemSchema } from '../inventory/inventory.schema';
import { FieldTask, FieldTaskSchema } from '../tasks/tasks.schema';
import { Inspection, InspectionSchema } from '../inspections/inspection.schema';
import { Evidence, EvidenceSchema } from '../evidence/evidence.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
@Module({
  imports: [MongooseModule.forFeature([
    { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
    { name: SalesOrder.name, schema: SalesOrderSchema },
    { name: InventoryItem.name, schema: InventoryItemSchema },
    { name: FieldTask.name, schema: FieldTaskSchema },
    { name: Inspection.name, schema: InspectionSchema },
    { name: Evidence.name, schema: EvidenceSchema },
  ])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
