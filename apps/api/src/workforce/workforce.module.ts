import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { WorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';
import { FarmWorker, FarmWorkerSchema, LabourTask, LabourTaskSchema, LabourEntry, LabourEntrySchema } from './workforce.schema';
@Module({
  imports: [MongooseModule.forFeature([
    { name: FarmWorker.name, schema: FarmWorkerSchema },
    { name: LabourTask.name, schema: LabourTaskSchema },
    { name: LabourEntry.name, schema: LabourEntrySchema },
  ]), AuditModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
