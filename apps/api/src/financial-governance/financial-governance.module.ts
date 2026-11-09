import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialGovernanceController } from './financial-governance.controller';
import { FinancialGovernanceService } from './financial-governance.service';
import { FinancialInvestigation, FinancialInvestigationSchema } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { StatementImport, StatementImportSchema, StatementRow, StatementRowSchema } from '../statement-matching/statement-matching.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FinancialInvestigation.name, schema: FinancialInvestigationSchema },
    { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
    { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
    { name: StatementImport.name, schema: StatementImportSchema },
    { name: StatementRow.name, schema: StatementRowSchema },
  ])],
  controllers: [FinancialGovernanceController],
  providers: [FinancialGovernanceService],
})
export class FinancialGovernanceModule {}
