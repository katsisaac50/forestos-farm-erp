import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Hive, HiveSchema } from '../hives/hive.schema';
import { ApiaryInspection, ApiaryInspectionSchema, HoneyHarvest, HoneyHarvestSchema } from './apiary-operation.schema';
import { ApiaryOperationsController } from './apiary-operations.controller';
import { ApiaryOperationsService } from './apiary-operations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiaryInspection.name, schema: ApiaryInspectionSchema },
      { name: HoneyHarvest.name, schema: HoneyHarvestSchema },
      { name: Hive.name, schema: HiveSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [ApiaryOperationsController],
  providers: [ApiaryOperationsService],
})
export class ApiaryOperationsModule {}
