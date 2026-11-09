import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialInvestigation, FinancialInvestigationSchema } from './financial-investigation.schema';
import { FinancialInvestigationController } from './financial-investigation.controller';
import { FinancialInvestigationService } from './financial-investigation.service';
import { AuditModule } from '../audit/audit.module';
@Module({imports:[MongooseModule.forFeature([{name:FinancialInvestigation.name,schema:FinancialInvestigationSchema}]),AuditModule],controllers:[FinancialInvestigationController],providers:[FinancialInvestigationService]})
export class FinancialInvestigationModule {}
