import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {CaseEvidence,CaseEvidenceSchema} from './case-evidence.schema';
import {CaseEvidenceEvent,CaseEvidenceEventSchema} from './case-evidence-event.schema';
import {EvidenceRecoveryIncident,EvidenceRecoveryIncidentSchema} from './evidence-recovery-incident.schema';
import {RecoveryEscalationEvent,RecoveryEscalationEventSchema} from './recovery-escalation-event.schema';
import {RecoverySchedulerState,RecoverySchedulerStateSchema} from './recovery-scheduler-state.schema';
import {FinancialInvestigationCase,FinancialInvestigationCaseSchema} from '../financial-investigation-cases/financial-investigation-case.schema';
import {CaseEvidenceController} from './case-evidence.controller';
import {CaseEvidenceService} from './case-evidence.service';
@Module({imports:[MongooseModule.forFeature([
 {name:CaseEvidence.name,schema:CaseEvidenceSchema},
 {name:CaseEvidenceEvent.name,schema:CaseEvidenceEventSchema},
 {name:EvidenceRecoveryIncident.name,schema:EvidenceRecoveryIncidentSchema},
 {name:RecoveryEscalationEvent.name,schema:RecoveryEscalationEventSchema},
 {name:RecoverySchedulerState.name,schema:RecoverySchedulerStateSchema},
 {name:FinancialInvestigationCase.name,schema:FinancialInvestigationCaseSchema}
])],controllers:[CaseEvidenceController],providers:[CaseEvidenceService]})
export class CaseEvidenceModule{}
