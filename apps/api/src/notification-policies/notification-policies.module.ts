import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {NotificationPolicy,NotificationPolicySchema} from './notification-policy.schema';
import {NotificationPolicyEvent,NotificationPolicyEventSchema} from './notification-policy-event.schema';
import {NotificationPoliciesController} from './notification-policies.controller';
import {NotificationPoliciesService} from './notification-policies.service';
import {EvidenceRecoveryIncident,EvidenceRecoveryIncidentSchema} from '../case-evidence/evidence-recovery-incident.schema';
@Module({
 imports:[MongooseModule.forFeature([
  {name:NotificationPolicy.name,schema:NotificationPolicySchema},
  {name:NotificationPolicyEvent.name,schema:NotificationPolicyEventSchema},
  {name:EvidenceRecoveryIncident.name,schema:EvidenceRecoveryIncidentSchema}
 ])],
 controllers:[NotificationPoliciesController],
 providers:[NotificationPoliciesService]
})
export class NotificationPoliciesModule{}
