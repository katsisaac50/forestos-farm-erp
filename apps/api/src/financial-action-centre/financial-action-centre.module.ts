import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialActionCentreController } from './financial-action-centre.controller';
import { FinancialAction, FinancialActionSchema } from './financial-action.schema';
import { FinancialActionCentreService } from './financial-action-centre.service';
import { FinancialInvestigation, FinancialInvestigationSchema } from '../financial-investigations/financial-investigation.schema';
import { FinancialReconciliation, FinancialReconciliationSchema } from '../financial-reconciliation/financial-reconciliation.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: FinancialAction.name, schema: FinancialActionSchema },
    { name: FinancialInvestigation.name, schema: FinancialInvestigationSchema },
    { name: FinancialReconciliation.name, schema: FinancialReconciliationSchema },
  ])],
  controllers: [FinancialActionCentreController],
  providers: [FinancialActionCentreService],
})
export class FinancialActionCentreModule {}
