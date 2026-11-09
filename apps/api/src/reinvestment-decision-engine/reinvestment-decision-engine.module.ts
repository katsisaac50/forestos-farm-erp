import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReinvestmentDecisionEngineController } from './reinvestment-decision-engine.controller';
import { ReinvestmentDecisionEngineService } from './reinvestment-decision-engine.service';
import { CashPosition,CashPositionSchema,CashflowPlan,CashflowPlanSchema,CapitalDecision,CapitalDecisionSchema } from '../cashflow/cashflow.schema';
import { FinancialEscalation,FinancialEscalationSchema } from '../financial-escalations/financial-escalations.schema';
@Module({
 imports:[MongooseModule.forFeature([
  {name:CashPosition.name,schema:CashPositionSchema},
  {name:CashflowPlan.name,schema:CashflowPlanSchema},
  {name:CapitalDecision.name,schema:CapitalDecisionSchema},
  {name:FinancialEscalation.name,schema:FinancialEscalationSchema},
 ])],
 controllers:[ReinvestmentDecisionEngineController],providers:[ReinvestmentDecisionEngineService],
})
export class ReinvestmentDecisionEngineModule {}
