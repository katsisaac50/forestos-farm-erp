import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { InvestmentController } from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentScenario, InvestmentScenarioSchema, InvestmentDecision, InvestmentDecisionSchema } from './investment.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: InvestmentScenario.name, schema: InvestmentScenarioSchema },
    { name: InvestmentDecision.name, schema: InvestmentDecisionSchema },
  ]), AuditModule],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}
