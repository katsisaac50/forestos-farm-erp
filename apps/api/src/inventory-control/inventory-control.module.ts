import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { StockItem, StockItemSchema, StockMovement, StockMovementSchema } from './inventory-control.schema';
import { InventoryControlService } from './inventory-control.service';
import { InventoryControlGlService } from './inventory-control-gl.service';
import { InventoryControlController } from './inventory-control.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockItem.name, schema: StockItemSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    AccountingModule,
    OrganizationsModule,
  ],
  controllers: [InventoryControlController],
  providers: [InventoryControlService, InventoryControlGlService],
  exports: [InventoryControlService, InventoryControlGlService],
})
export class InventoryControlModule {}