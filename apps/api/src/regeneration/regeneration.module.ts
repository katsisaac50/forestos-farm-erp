import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RegenerationPlan, RegenerationPlanSchema, RegenerationCost, RegenerationCostSchema, SurvivalCheck, SurvivalCheckSchema } from './regeneration.schema';
import { RegenerationController } from './regeneration.controller';
import { RegenerationService } from './regeneration.service';
import { RegenerationGlService } from './regeneration-gl.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegenerationPlan.name, schema: RegenerationPlanSchema },
      { name: RegenerationCost.name, schema: RegenerationCostSchema },
      { name: SurvivalCheck.name, schema: SurvivalCheckSchema },
    ]),
    AccountingModule,
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [RegenerationController],
  providers: [RegenerationService, RegenerationGlService],
  exports: [RegenerationService],
})
export class RegenerationModule {}