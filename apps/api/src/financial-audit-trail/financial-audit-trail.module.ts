import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialAuditTrailController } from './financial-audit-trail.controller';
import { FinancialAuditTrailService } from './financial-audit-trail.service';
import { FinancialAuditEntry, FinancialAuditEntrySchema } from './financial-audit-trail.schema';
import { FinancialEvidence, FinancialEvidenceSchema } from '../financial-evidence/financial-evidence.schema';
import { FinancialAction, FinancialActionSchema } from '../financial-action-centre/financial-action.schema';
import { FinancialInvestigation, FinancialInvestigationSchema } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';

@Module({
 imports: [MongooseModule.forFeature([
  { name: FinancialAuditEntry.name, schema: FinancialAuditEntrySchema },
  { name: FinancialEvidence.name, schema: FinancialEvidenceSchema },
  { name: FinancialAction.name, schema: FinancialActionSchema },
  { name: FinancialInvestigation.name, schema: FinancialInvestigationSchema },
  { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
  { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
 ])],
 controllers: [FinancialAuditTrailController],
 providers: [FinancialAuditTrailService],
})
export class FinancialAuditTrailModule {}
