import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialReconciliation, FinancialReconciliationSchema } from './financial-reconciliation.schema';
import { FinancialReconciliationController } from './financial-reconciliation.controller';
import { FinancialReconciliationService } from './financial-reconciliation.service';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
    { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
  ])],
  controllers: [FinancialReconciliationController],
  providers: [FinancialReconciliationService],
})
export class FinancialReconciliationModule {}
