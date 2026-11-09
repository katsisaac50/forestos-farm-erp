import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { RegenerationController } from './regeneration.controller';
import { RegenerationService } from './regeneration.service';
import { RegenerationPlan, RegenerationPlanSchema, RegenerationCost, RegenerationCostSchema, SurvivalCheck, SurvivalCheckSchema } from './regeneration.schema';
@Module({
  imports: [MongooseModule.forFeature([
    { name: RegenerationPlan.name, schema: RegenerationPlanSchema },
    { name: RegenerationCost.name, schema: RegenerationCostSchema },
    { name: SurvivalCheck.name, schema: SurvivalCheckSchema },
  ]), AuditModule],
  controllers: [RegenerationController],
  providers: [RegenerationService],
})
export class RegenerationModule {}
