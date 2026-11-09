import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialControlReportController } from './financial-control-report.controller';
import { FinancialControlReportService } from './financial-control-report.service';
import { FinancialEscalation, FinancialEscalationSchema } from '../financial-escalations/financial-escalations.schema';
import { FinancialAction, FinancialActionSchema } from '../financial-action-centre/financial-action.schema';
import { FinancialInvestigation, FinancialInvestigationSchema } from '../financial-investigations/financial-investigation.schema';
import { FinancialEvidence, FinancialEvidenceSchema } from '../financial-evidence/financial-evidence.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';

@Module({
 imports: [MongooseModule.forFeature([
  { name: FinancialEscalation.name, schema: FinancialEscalationSchema },
  { name: FinancialAction.name, schema: FinancialActionSchema },
  { name: FinancialInvestigation.name, schema: FinancialInvestigationSchema },
  { name: FinancialEvidence.name, schema: FinancialEvidenceSchema },
  { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
 ])],
 controllers: [FinancialControlReportController],
 providers: [FinancialControlReportService],
})
export class FinancialControlReportModule {}
