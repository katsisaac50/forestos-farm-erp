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
  providers: [PostingService, TrialBalanceService, BackfillService, FinanceGlAdapter],
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