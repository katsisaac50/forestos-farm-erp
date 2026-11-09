import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SopTemplate,SopTemplateSchema,SopRun,SopRunSchema } from './sop.schema';
import { Plantation,PlantationSchema } from '../plantations/plantation.schema';
import { Hive,HiveSchema } from '../hives/hive.schema';
import { Inspection,InspectionSchema } from '../inspections/inspection.schema';
import { StandardOperatingProceduresController } from './standard-operating-procedures.controller';
import { StandardOperatingProceduresService } from './standard-operating-procedures.service';
@Module({
 imports:[MongooseModule.forFeature([
  {name:SopTemplate.name,schema:SopTemplateSchema},
  {name:SopRun.name,schema:SopRunSchema},
  {name:Plantation.name,schema:PlantationSchema},
  {name:Hive.name,schema:HiveSchema},
  {name:Inspection.name,schema:InspectionSchema},
 ])],
 controllers:[StandardOperatingProceduresController],providers:[StandardOperatingProceduresService],
})
export class StandardOperatingProceduresModule {}
