import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceTransaction, FinanceTransactionSchema } from './finance.schema';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FinanceTransaction.name, schema: FinanceTransactionSchema }]),
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}