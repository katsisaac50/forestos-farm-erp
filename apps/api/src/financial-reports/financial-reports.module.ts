import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: FinanceTransaction.name, schema: FinanceTransactionSchema }])],
  controllers: [FinancialReportsController],
  providers: [FinancialReportsService],
})
export class FinancialReportsModule {}
