import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialExceptionsController } from './financial-exceptions.controller';
import { FinancialExceptionsService } from './financial-exceptions.service';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';
import { StatementImport, StatementImportSchema, StatementRow, StatementRowSchema } from '../statement-matching/statement-matching.schema';
@Module({
 imports:[MongooseModule.forFeature([
  {name:FinanceTransaction.name,schema:FinanceTransactionSchema},
  {name:FinancialReconciliation.name,schema:FinancialReconciliationSchema},
  {name:StatementImport.name,schema:StatementImportSchema},
  {name:StatementRow.name,schema:StatementRowSchema}
 ])],
 controllers:[FinancialExceptionsController],providers:[FinancialExceptionsService]
})
export class FinancialExceptionsModule {}
