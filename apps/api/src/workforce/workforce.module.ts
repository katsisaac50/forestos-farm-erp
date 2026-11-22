import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { FarmWorker, FarmWorkerSchema, LabourTask, LabourTaskSchema, LabourEntry, LabourEntrySchema } from './workforce.schema';
import { WorkforceService } from './workforce.service';
import { WorkforceGlService } from './workforce-gl.service';
import { WorkforceController } from './workforce.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FarmWorker.name, schema: FarmWorkerSchema },
      { name: LabourTask.name, schema: LabourTaskSchema },
      { name: LabourEntry.name, schema: LabourEntrySchema },
    ]),
    AccountingModule,
    AuditModule,
  ],
  controllers: [WorkforceController],
  providers: [WorkforceService, WorkforceGlService],
})
export class WorkforceModule {}