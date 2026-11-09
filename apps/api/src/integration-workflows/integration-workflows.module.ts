import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {IntegrationWorkflowsController} from './integration-workflows.controller';
import {IntegrationWorkflowsService} from './integration-workflows.service';
import {WorkflowEvent,WorkflowEventSchema} from './workflow-event.schema';
import {InventoryControlModule} from '../inventory-control/inventory-control.module';
import { OrganizationsModule } from '../organizations/organizations.module';
@Module({imports:[MongooseModule.forFeature([{name:WorkflowEvent.name,schema:WorkflowEventSchema}]),InventoryControlModule,OrganizationsModule],controllers:[IntegrationWorkflowsController],providers:[IntegrationWorkflowsService]})
export class IntegrationWorkflowsModule{}
