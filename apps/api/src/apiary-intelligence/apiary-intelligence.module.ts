import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Hive, HiveSchema } from '../hives/hive.schema';
import { ApiaryInspection, ApiaryInspectionSchema, HoneyHarvest, HoneyHarvestSchema } from '../apiary-operations/apiary-operation.schema';
import { ApiaryIntelligenceController } from './apiary-intelligence.controller';
import { ApiaryIntelligenceService } from './apiary-intelligence.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Hive.name, schema: HiveSchema },
    { name: ApiaryInspection.name, schema: ApiaryInspectionSchema },
    { name: HoneyHarvest.name, schema: HoneyHarvestSchema },
  ]), OrganizationsModule],
  controllers: [ApiaryIntelligenceController],
  providers: [ApiaryIntelligenceService],
})
export class ApiaryIntelligenceModule {}
