import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertState, AlertStateSchema } from './alert.schema';
import { StockItem, StockItemSchema } from '../inventory-control/inventory.schema';
import { LabourTask, LabourTaskSchema } from '../workforce/workforce.schema';
import { WorkflowEvent, WorkflowEventSchema } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceTargetSchema, PerformanceUpdate, PerformanceUpdateSchema } from '../performance-strategy/performance.schema';
import { FarmRisk, FarmRiskSchema } from '../risk-management/risk.schema';
import { AlertCenterController } from './alert-center.controller';
import { AlertCenterService } from './alert-center.service';
@Module({
 imports:[MongooseModule.forFeature([
  {name:AlertState.name,schema:AlertStateSchema},
  {name:StockItem.name,schema:StockItemSchema},
  {name:LabourTask.name,schema:LabourTaskSchema},
  {name:WorkflowEvent.name,schema:WorkflowEventSchema},
  {name:PerformanceTarget.name,schema:PerformanceTargetSchema},
  {name:PerformanceUpdate.name,schema:PerformanceUpdateSchema},
  {name:FarmRisk.name,schema:FarmRiskSchema},
 ])],
 controllers:[AlertCenterController],providers:[AlertCenterService],
})
export class AlertCenterModule {}
