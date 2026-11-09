import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlertState, AlertStateSchema } from '../alert-center/alert.schema';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { CashPosition, CashPositionSchema, CashflowPlan, CashflowPlanSchema } from '../cashflow/cashflow.schema';
import { StockItem, StockItemSchema } from '../inventory-control/inventory.schema';
import { LabourTask, LabourTaskSchema } from '../workforce/workforce.schema';
import { WorkflowEvent, WorkflowEventSchema } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceTargetSchema, PerformanceUpdate, PerformanceUpdateSchema } from '../performance-strategy/performance.schema';
import { FarmRisk, FarmRiskSchema, RiskAction, RiskActionSchema } from '../risk-management/risk.schema';
import { MaintenanceRecord, MaintenanceRecordSchema } from '../maintenance/maintenance.schema';
import { CommandCentreController } from './command-centre.controller';
import { CommandCentreService } from './command-centre.service';
@Module({
 imports:[MongooseModule.forFeature([
  {name:AlertState.name,schema:AlertStateSchema},
  {name:FinanceTransaction.name,schema:FinanceTransactionSchema},
  {name:CashPosition.name,schema:CashPositionSchema},
  {name:CashflowPlan.name,schema:CashflowPlanSchema},
  {name:StockItem.name,schema:StockItemSchema},
  {name:LabourTask.name,schema:LabourTaskSchema},
  {name:WorkflowEvent.name,schema:WorkflowEventSchema},
  {name:PerformanceTarget.name,schema:PerformanceTargetSchema},
  {name:PerformanceUpdate.name,schema:PerformanceUpdateSchema},
  {name:FarmRisk.name,schema:FarmRiskSchema},
  {name:RiskAction.name,schema:RiskActionSchema},
  {name:MaintenanceRecord.name,schema:MaintenanceRecordSchema},
 ])],
 controllers:[CommandCentreController],providers:[CommandCentreService],
})
export class CommandCentreModule {}
