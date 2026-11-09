import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {DataIntegrityController} from './data-integrity.controller';
import {DataIntegrityService} from './data-integrity.service';
import {FinanceTransaction,FinanceTransactionSchema} from '../finance/finance.schema';
import {StockItem,StockItemSchema,StockMovement,StockMovementSchema} from '../inventory-control/inventory.schema';
import {WorkflowEvent,WorkflowEventSchema} from '../integration-workflows/workflow-event.schema';
import {Inspection,InspectionSchema} from '../inspections/inspection.schema';
import {FarmRisk,FarmRiskSchema} from '../risk-management/risk.schema';
import {LabourTask,LabourTaskSchema} from '../workforce/workforce.schema';
@Module({imports:[MongooseModule.forFeature([
 {name:FinanceTransaction.name,schema:FinanceTransactionSchema},
 {name:StockItem.name,schema:StockItemSchema},{name:StockMovement.name,schema:StockMovementSchema},
 {name:WorkflowEvent.name,schema:WorkflowEventSchema},{name:Inspection.name,schema:InspectionSchema},
 {name:FarmRisk.name,schema:FarmRiskSchema},{name:LabourTask.name,schema:LabourTaskSchema},
])],controllers:[DataIntegrityController],providers:[DataIntegrityService]})
export class DataIntegrityModule{}
