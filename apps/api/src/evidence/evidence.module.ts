import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Evidence, EvidenceSchema } from './evidence.schema';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Evidence.name, schema: EvidenceSchema }]),
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}


// import {Module} from '@nestjs/common';import {MongooseModule} from '@nestjs/mongoose';import {Evidence,EvidenceSchema} from './evidence.schema';import {EvidenceController} from './evidence.controller';import {EvidenceService} from './evidence.service';import {AuditModule} from '../audit/audit.module';
// @Module({imports:[MongooseModule.forFeature([{name:Evidence.name,schema:EvidenceSchema}]),AuditModule],controllers:[EvidenceController],providers:[EvidenceService]}) export class EvidenceModule{}
