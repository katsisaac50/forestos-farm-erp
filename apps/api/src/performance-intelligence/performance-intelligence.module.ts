import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { StockItem, StockItemSchema } from '../inventory-control/inventory.schema';
import { LabourTask, LabourTaskSchema } from '../workforce/workforce.schema';
import { WorkflowEvent, WorkflowEventSchema } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceTargetSchema, PerformanceUpdate, PerformanceUpdateSchema } from '../performance-strategy/performance.schema';
import { PerformanceIntelligenceController } from './performance-intelligence.controller';
import { PerformanceIntelligenceService } from './performance-intelligence.service';
@Module({
  imports:[MongooseModule.forFeature([
    {name:FinanceTransaction.name,schema:FinanceTransactionSchema},
    {name:StockItem.name,schema:StockItemSchema},
    {name:LabourTask.name,schema:LabourTaskSchema},
    {name:WorkflowEvent.name,schema:WorkflowEventSchema},
    {name:PerformanceTarget.name,schema:PerformanceTargetSchema},
    {name:PerformanceUpdate.name,schema:PerformanceUpdateSchema},
  ])],
  controllers:[PerformanceIntelligenceController],
  providers:[PerformanceIntelligenceService],
})
export class PerformanceIntelligenceModule {}
