import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { NurseryController } from './nursery.controller';
import { NurseryService } from './nursery.service';
import { NurseryBatch, NurseryBatchSchema, NurseryMovement, NurseryMovementSchema } from './nursery.schema';
@Module({
  imports: [MongooseModule.forFeature([
    { name: NurseryBatch.name, schema: NurseryBatchSchema },
    { name: NurseryMovement.name, schema: NurseryMovementSchema },
  ]), AuditModule],
  controllers: [NurseryController],
  providers: [NurseryService],
})
export class NurseryModule {}
