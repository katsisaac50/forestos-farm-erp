import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Hive, HiveSchema } from '../hives/hive.schema';
import { ApiaryInspection, ApiaryInspectionSchema } from '../apiary-operations/apiary-operation.schema';
import { ApiaryAction, ApiaryActionSchema, ApiaryActionEvent, ApiaryActionEventSchema } from './apiary-action.schema';
import { ApiaryActionsController } from './apiary-actions.controller';
import { ApiaryActionsService } from './apiary-actions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiaryAction.name, schema: ApiaryActionSchema },
      { name: ApiaryActionEvent.name, schema: ApiaryActionEventSchema },
      { name: Hive.name, schema: HiveSchema },
      { name: ApiaryInspection.name, schema: ApiaryInspectionSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [ApiaryActionsController],
  providers: [ApiaryActionsService],
})
export class ApiaryActionsModule {}
