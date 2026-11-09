import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CorrectiveActionsController } from './corrective-actions.controller';
import { CorrectiveActionsService } from './corrective-actions.service';
import { CorrectiveAction, CorrectiveActionSchema } from './corrective-action.schema';
import { FieldInspection, FieldInspectionSchema } from '../field-inspections/field-inspection.schema';
@Module({imports:[MongooseModule.forFeature([{name:CorrectiveAction.name,schema:CorrectiveActionSchema},{name:FieldInspection.name,schema:FieldInspectionSchema}])],controllers:[CorrectiveActionsController],providers:[CorrectiveActionsService]})
export class CorrectiveActionsModule{}
