import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { FarmAsset, FarmAssetSchema, MaintenanceRecord, MaintenanceRecordSchema, SparePart, SparePartSchema } from './maintenance.schema';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceGlService } from './maintenance-gl.service';
import { MaintenanceController } from './maintenance.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FarmAsset.name, schema: FarmAssetSchema },
      { name: MaintenanceRecord.name, schema: MaintenanceRecordSchema },
      { name: SparePart.name, schema: SparePartSchema },
    ]),
    AccountingModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceGlService],
})
export class MaintenanceModule {}