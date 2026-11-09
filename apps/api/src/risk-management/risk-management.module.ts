import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FarmRisk, FarmRiskSchema, RiskAction, RiskActionSchema } from './risk.schema';
import { RiskManagementController } from './risk-management.controller';
import { RiskManagementService } from './risk-management.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FarmRisk.name, schema: FarmRiskSchema },
    { name: RiskAction.name, schema: RiskActionSchema },
  ])],
  controllers: [RiskManagementController],
  providers: [RiskManagementService],
})
export class RiskManagementModule {}
