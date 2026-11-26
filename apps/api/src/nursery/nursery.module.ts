import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { NurseryBatch, NurseryBatchSchema, NurseryMovement, NurseryMovementSchema } from './nursery.schema';
import { NurseryController } from './nursery.controller';
import { NurseryService } from './nursery.service';
import { NurseryGlService } from './nursery-gl.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NurseryBatch.name, schema: NurseryBatchSchema },
      { name: NurseryMovement.name, schema: NurseryMovementSchema },
    ]),
    AccountingModule,
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [NurseryController],
  providers: [NurseryService, NurseryGlService],
  exports: [NurseryService],
})
export class NurseryModule {}