import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { CostIntelligenceController } from './cost-intelligence.controller';
import { CostIntelligenceService } from './cost-intelligence.service';
import { CostBudgetPlan, CostBudgetPlanSchema, CostAllocation, CostAllocationSchema } from './cost-intelligence.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: CostBudgetPlan.name, schema: CostBudgetPlanSchema },
    { name: CostAllocation.name, schema: CostAllocationSchema },
  ]), AuditModule],
  controllers: [CostIntelligenceController],
  providers: [CostIntelligenceService],
})
export class CostIntelligenceModule {}
