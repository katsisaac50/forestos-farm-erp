import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialEscalationsController } from './financial-escalations.controller';
import { FinancialEscalationsService } from './financial-escalations.service';
import { FinancialEscalation, FinancialEscalationSchema } from './financial-escalations.schema';
import { FinancialInvestigation, FinancialInvestigationSchema } from '../financial-investigations/financial-investigation.schema';
import { FinancialAction, FinancialActionSchema } from '../financial-action-centre/financial-action.schema';
import { FinancialEvidence, FinancialEvidenceSchema } from '../financial-evidence/financial-evidence.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';

@Module({
 imports: [MongooseModule.forFeature([
  { name: FinancialEscalation.name, schema: FinancialEscalationSchema },
  { name: FinancialEscalation.name, schema: FinancialEscalationSchema },
  { name: FinancialInvestigation.name, schema: FinancialInvestigationSchema },
  { name: FinancialAction.name, schema: FinancialActionSchema },
  { name: FinancialEvidence.name, schema: FinancialEvidenceSchema },
  { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
 ])],
 controllers: [FinancialEscalationsController],
 providers: [FinancialEscalationsService],
})
export class FinancialEscalationsModule {}
