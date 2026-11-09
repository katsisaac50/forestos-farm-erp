import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatementImport, StatementImportSchema, StatementRow, StatementRowSchema } from './statement-matching.schema';
import { StatementMatchingController } from './statement-matching.controller';
import { StatementMatchingService } from './statement-matching.service';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StatementImport.name, schema: StatementImportSchema },
      { name: StatementRow.name, schema: StatementRowSchema },
      { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
    ]),
    AuditModule,
  ],
  controllers: [StatementMatchingController],
  providers: [StatementMatchingService],
})
export class StatementMatchingModule {}
