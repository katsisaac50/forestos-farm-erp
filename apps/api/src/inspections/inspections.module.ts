import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inspection, InspectionSchema } from './inspection.schema';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Inspection.name, schema: InspectionSchema }]),
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}


// import {Module} from '@nestjs/common';
// import {MongooseModule} from '@nestjs/mongoose';
// import {Inspection,InspectionSchema} from './inspection.schema';
// import {InspectionsController} from './inspections.controller';
// import {InspectionsService} from './inspections.service';import {AuditModule} from '../audit/audit.module';
// @Module({imports:[MongooseModule.forFeature([{name:Inspection.name,schema:InspectionSchema}]),AuditModule],controllers:[InspectionsController],providers:[InspectionsService]})
// export class InspectionsModule{}
