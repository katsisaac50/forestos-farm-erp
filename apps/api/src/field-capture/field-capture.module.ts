import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from '../organizations/organizations.module';
import { FieldTask, FieldTaskSchema } from '../field-workforce/field-workforce.schema';
import { FieldCapture, FieldCaptureSchema } from './field-capture.schema';
import { FieldCaptureController } from './field-capture.controller';
import { FieldCaptureService } from './field-capture.service';
import { EvidenceStorageService } from './evidence-storage.service';
import { EvidenceAccessEvent, EvidenceAccessEventSchema } from './evidence-access-event.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FieldCapture.name, schema: FieldCaptureSchema },
    { name: FieldTask.name, schema: FieldTaskSchema },
    { name: EvidenceAccessEvent.name, schema: EvidenceAccessEventSchema },
  ]), OrganizationsModule],
  controllers: [FieldCaptureController],
  providers: [FieldCaptureService, EvidenceStorageService],
})
export class FieldCaptureModule {}
