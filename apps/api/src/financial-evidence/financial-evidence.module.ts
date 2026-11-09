import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialEvidenceController } from './financial-evidence.controller';
import { FinancialEvidenceService } from './financial-evidence.service';
import { FinancialEvidence, FinancialEvidenceSchema } from './financial-evidence.schema';
import { FinancialAction, FinancialActionSchema } from '../financial-action-centre/financial-action.schema';
@Module({ imports: [MongooseModule.forFeature([
 { name: FinancialEvidence.name, schema: FinancialEvidenceSchema },
 { name: FinancialAction.name, schema: FinancialActionSchema },
])], controllers: [FinancialEvidenceController], providers: [FinancialEvidenceService] })
export class FinancialEvidenceModule {}
