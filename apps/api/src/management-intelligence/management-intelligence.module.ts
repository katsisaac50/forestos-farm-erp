import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {ManagementIntelligenceController} from './management-intelligence.controller';
import {ManagementIntelligenceService} from './management-intelligence.service';
import {FinanceTransaction,FinanceTransactionSchema} from '../finance/finance.schema';
import {LabourTask,LabourTaskSchema} from '../workforce/workforce.schema';
import {StockItem,StockItemSchema} from '../inventory-control/inventory.schema';
import {WorkflowEvent,WorkflowEventSchema} from '../integration-workflows/workflow-event.schema';
import {Inspection,InspectionSchema} from '../inspections/inspection.schema';
import {FarmRisk,FarmRiskSchema} from '../risk-management/risk.schema';
@Module({imports:[MongooseModule.forFeature([
 {name:FinanceTransaction.name,schema:FinanceTransactionSchema},
 {name:LabourTask.name,schema:LabourTaskSchema},
 {name:StockItem.name,schema:StockItemSchema},
 {name:WorkflowEvent.name,schema:WorkflowEventSchema},
 {name:Inspection.name,schema:InspectionSchema},
 {name:FarmRisk.name,schema:FarmRiskSchema},
])],controllers:[ManagementIntelligenceController],providers:[ManagementIntelligenceService]})
export class ManagementIntelligenceModule{}
