import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialControlPerformanceController } from './financial-control-performance.controller';
import { FinancialControlPerformanceService } from './financial-control-performance.service';
import { FinancialEscalation, FinancialEscalationSchema } from '../financial-escalations/financial-escalations.schema';
import { FinancialAction, FinancialActionSchema } from '../financial-action-centre/financial-action.schema';
@Module({
 imports:[MongooseModule.forFeature([
  {name:FinancialEscalation.name,schema:FinancialEscalationSchema},
  {name:FinancialAction.name,schema:FinancialActionSchema},
 ])],
 controllers:[FinancialControlPerformanceController],
 providers:[FinancialControlPerformanceService],
})
export class FinancialControlPerformanceModule {}
