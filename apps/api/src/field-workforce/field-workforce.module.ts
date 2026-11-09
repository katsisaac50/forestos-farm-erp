import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ApiaryAction, ApiaryActionSchema } from '../apiary-actions/apiary-action.schema';
import { FieldWorker, FieldWorkerSchema, FieldTask, FieldTaskSchema, FieldTaskEvent, FieldTaskEventSchema } from './field-workforce.schema';
import { FieldWorkforceController } from './field-workforce.controller';
import { FieldWorkforceService } from './field-workforce.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FieldWorker.name, schema: FieldWorkerSchema },
    { name: FieldTask.name, schema: FieldTaskSchema },
    { name: FieldTaskEvent.name, schema: FieldTaskEventSchema },
    { name: ApiaryAction.name, schema: ApiaryActionSchema },
  ]), OrganizationsModule],
  controllers: [FieldWorkforceController],
  providers: [FieldWorkforceService],
})
export class FieldWorkforceModule {}
