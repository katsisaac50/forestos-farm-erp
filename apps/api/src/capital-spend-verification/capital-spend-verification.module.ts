import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { CapitalAllocationProposal,CapitalAllocationProposalSchema } from '../capital-allocation/capital-allocation.schema';
import { CapitalSpendRecord,CapitalSpendRecordSchema } from './capital-spend-verification.schema';
import { CapitalSpendVerificationController } from './capital-spend-verification.controller';
import { CapitalSpendVerificationService } from './capital-spend-verification.service';
import { SpendEvidenceEvent, SpendEvidenceEventSchema } from './spend-evidence-event.schema';
@Module({imports:[MongooseModule.forFeature([
 {name:CapitalAllocationProposal.name,schema:CapitalAllocationProposalSchema},
 {name:CapitalSpendRecord.name,schema:CapitalSpendRecordSchema},
 {name:SpendEvidenceEvent.name,schema:SpendEvidenceEventSchema},
]),AuditModule],controllers:[CapitalSpendVerificationController],providers:[CapitalSpendVerificationService]})
export class CapitalSpendVerificationModule {}
