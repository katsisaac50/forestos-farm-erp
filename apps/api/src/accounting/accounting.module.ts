import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountingPeriod, AccountingPeriodSchema,
  ChartOfAccount, ChartOfAccountSchema,
  JournalEntry, JournalEntrySchema,
  JournalLine, JournalLineSchema,
} from './accounting.schema';
import { PostingService } from './posting.service';
import { TrialBalanceService } from './trial-balance.service';
import { BackfillService } from './backfill.service';
import { AccountingController } from './accounting.controller';
import { FinanceGlAdapter } from './finance-gl-adapter.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MongooseModule as CoreMongooseModule } from '@nestjs/mongoose';
import { FinanceTransaction, FinanceTransactionSchema } from '../finance/finance.schema';
import { FinancialReportsService } from './financial-reports.service';
import { PeriodsService } from './periods.service'; 
import { JournalEntriesService } from './journal-entries.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccount.name, schema: ChartOfAccountSchema },
      { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: JournalLine.name, schema: JournalLineSchema },
      { name: FinanceTransaction.name, schema: FinanceTransactionSchema },
    ]),
    OrganizationsModule,
  ],
  controllers: [AccountingController],
  providers: [PeriodsService, PostingService, TrialBalanceService, BackfillService, FinancialReportsService,FinanceGlAdapter, JournalEntriesService],
exports: [PostingService, FinanceGlAdapter, MongooseModule],
})
export class AccountingModule {}



// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import {
//   AccountingPeriod, AccountingPeriodSchema,
//   ChartOfAccount, ChartOfAccountSchema,
//   JournalEntry, JournalEntrySchema,
//   JournalLine, JournalLineSchema,
// } from './accounting.schema';
// import { PostingService } from './posting.service';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: ChartOfAccount.name, schema: ChartOfAccountSchema },
//       { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
//       { name: JournalEntry.name, schema: JournalEntrySchema },
//       { name: JournalLine.name, schema: JournalLineSchema },
//     ]),
//   ],
//   providers: [PostingService],
//   exports: [PostingService, MongooseModule,],
// })
// export class AccountingModule {}