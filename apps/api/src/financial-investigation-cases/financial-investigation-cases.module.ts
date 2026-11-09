import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialInvestigationCase, FinancialInvestigationCaseSchema } from './financial-investigation-case.schema';
import { FinancialInvestigationCaseEvent, FinancialInvestigationCaseEventSchema } from './financial-investigation-case-event.schema';
import { FinancialInvestigationCasesController } from './financial-investigation-cases.controller';
import { FinancialInvestigationCasesService } from './financial-investigation-cases.service';
@Module({ imports: [MongooseModule.forFeature([
 { name: FinancialInvestigationCase.name, schema: FinancialInvestigationCaseSchema },
 { name: FinancialInvestigationCaseEvent.name, schema: FinancialInvestigationCaseEventSchema },
])], controllers: [FinancialInvestigationCasesController], providers: [FinancialInvestigationCasesService] })
export class FinancialInvestigationCasesModule {}
