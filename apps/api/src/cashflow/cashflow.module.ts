import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { CashflowController } from './cashflow.controller';
import { CashflowService } from './cashflow.service';
import { CashPosition, CashPositionSchema, CashflowPlan, CashflowPlanSchema, CapitalDecision, CapitalDecisionSchema } from './cashflow.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: CashPosition.name, schema: CashPositionSchema },
    { name: CashflowPlan.name, schema: CashflowPlanSchema },
    { name: CapitalDecision.name, schema: CapitalDecisionSchema },
  ]), AuditModule],
  controllers: [CashflowController],
  providers: [CashflowService],
})
export class CashflowModule {}
