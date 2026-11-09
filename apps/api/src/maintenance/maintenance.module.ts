import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FarmAsset,FarmAssetSchema,MaintenanceRecord,MaintenanceRecordSchema,SparePart,SparePartSchema } from './maintenance.schema';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
@Module({imports:[MongooseModule.forFeature([{name:FarmAsset.name,schema:FarmAssetSchema},{name:MaintenanceRecord.name,schema:MaintenanceRecordSchema},{name:SparePart.name,schema:SparePartSchema}])],controllers:[MaintenanceController],providers:[MaintenanceService]})
export class MaintenanceModule{}
