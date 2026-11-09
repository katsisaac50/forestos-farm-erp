import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HarvestController } from './harvest.controller';
import { HarvestService } from './harvest.service';
import { HarvestPlan, HarvestPlanSchema, TimberQuote, TimberQuoteSchema, HarvestCost, HarvestCostSchema } from './harvest.schema';
import { AuditModule } from '../audit/audit.module';
@Module({
  imports: [MongooseModule.forFeature([
    { name: HarvestPlan.name, schema: HarvestPlanSchema },
    { name: TimberQuote.name, schema: TimberQuoteSchema },
    { name: HarvestCost.name, schema: HarvestCostSchema },
  ]), AuditModule],
  controllers: [HarvestController],
  providers: [HarvestService],
})
export class HarvestModule {}
