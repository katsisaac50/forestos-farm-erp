import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {StockItem,StockItemSchema,StockMovement,StockMovementSchema} from './inventory.schema';
import {InventoryControlController} from './inventory-control.controller';
import {InventoryControlService} from './inventory-control.service';
import {OrganizationsModule} from '../organizations/organizations.module';
@Module({imports:[OrganizationsModule,MongooseModule.forFeature([{name:StockItem.name,schema:StockItemSchema},{name:StockMovement.name,schema:StockMovementSchema}])],controllers:[InventoryControlController],providers:[InventoryControlService],exports:[InventoryControlService]})
export class InventoryControlModule{}
