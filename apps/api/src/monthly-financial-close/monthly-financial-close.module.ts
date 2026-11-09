import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';
import { FinancialEscalation, FinancialEscalationSchema } from '../financial-escalations/financial-escalations.schema';
import { CapitalSpendRecord, CapitalSpendRecordSchema } from '../capital-spend-verification/capital-spend-verification.schema';
import { MonthlyFinancialClose, MonthlyFinancialCloseSchema } from './monthly-financial-close.schema';
import { MonthlyFinancialCloseController } from './monthly-financial-close.controller';
import { MonthlyFinancialCloseService } from './monthly-financial-close.service';
import { MonthlyCloseVersion, MonthlyCloseVersionSchema } from './monthly-close-version.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: MonthlyFinancialClose.name, schema: MonthlyFinancialCloseSchema },
    { name: MonthlyCloseVersion.name, schema: MonthlyCloseVersionSchema },
    { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
    { name: FinancialEscalation.name, schema: FinancialEscalationSchema },
    { name: CapitalSpendRecord.name, schema: CapitalSpendRecordSchema },
  ]), AuditModule],
  controllers: [MonthlyFinancialCloseController],
  providers: [MonthlyFinancialCloseService],
})
export class MonthlyFinancialCloseModule {}