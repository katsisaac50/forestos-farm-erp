import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AccountingPeriod, AccountingPeriodSchema,
  ChartOfAccount, ChartOfAccountSchema,
  JournalEntry, JournalEntrySchema,
  JournalLine, JournalLineSchema,
} from './accounting.schema';
import { PostingService } from './posting.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChartOfAccount.name, schema: ChartOfAccountSchema },
      { name: AccountingPeriod.name, schema: AccountingPeriodSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: JournalLine.name, schema: JournalLineSchema },
    ]),
  ],
  providers: [PostingService],
  exports: [PostingService, MongooseModule,],
})
export class AccountingModule {}