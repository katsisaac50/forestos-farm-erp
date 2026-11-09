import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { CashPosition,CashPositionSchema,CashflowPlan,CashflowPlanSchema,CapitalDecision,CapitalDecisionSchema } from '../cashflow/cashflow.schema';
import { FinancialEscalation,FinancialEscalationSchema } from '../financial-escalations/financial-escalations.schema';
import { CapitalAllocationPolicy,CapitalAllocationPolicySchema,CapitalAllocationProposal,CapitalAllocationProposalSchema } from './capital-allocation.schema';
import { CapitalAllocationController } from './capital-allocation.controller';
import { CapitalAllocationService } from './capital-allocation.service';
@Module({imports:[MongooseModule.forFeature([
 {name:CapitalAllocationPolicy.name,schema:CapitalAllocationPolicySchema},
 {name:CapitalAllocationProposal.name,schema:CapitalAllocationProposalSchema},
 {name:CashPosition.name,schema:CashPositionSchema},
 {name:CashflowPlan.name,schema:CashflowPlanSchema},
 {name:CapitalDecision.name,schema:CapitalDecisionSchema},
 {name:FinancialEscalation.name,schema:FinancialEscalationSchema},
]),AuditModule],controllers:[CapitalAllocationController],providers:[CapitalAllocationService]})
export class CapitalAllocationModule {}
