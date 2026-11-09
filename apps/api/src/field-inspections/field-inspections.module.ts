import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FieldInspectionsController } from './field-inspections.controller';
import { FieldInspectionsService } from './field-inspections.service';
import { FieldInspection, FieldInspectionSchema } from './field-inspection.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FieldInspection.name, schema: FieldInspectionSchema }])],
  controllers: [FieldInspectionsController],
  providers: [FieldInspectionsService],
})
export class FieldInspectionsModule {}
