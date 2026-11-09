import { RegistryPersistenceModule } from './registry-persistence/registry-persistence.module';
import {SalesModule} from './sales/sales.module';
import {InventoryModule} from './inventory/inventory.module';
import { FieldCaptureModule } from './field-capture/field-capture.module';
import { FieldWorkforceModule } from './field-workforce/field-workforce.module';
import { ApiaryActionsModule } from './apiary-actions/apiary-actions.module';
import { ApiaryIntelligenceModule } from './apiary-intelligence/apiary-intelligence.module';
import { ApiaryOperationsModule } from './apiary-operations/apiary-operations.module';
import {OrganizationsModule} from './organizations/organizations.module';
import {NotificationPoliciesModule} from './notification-policies/notification-policies.module';
import {CaseEvidenceModule} from './case-evidence/case-evidence.module';
import { FinancialInvestigationCasesModule } from './financial-investigation-cases/financial-investigation-cases.module';
import { MonthlyFinancialCloseModule } from './monthly-financial-close/monthly-financial-close.module';
import { CapitalSpendVerificationModule } from './capital-spend-verification/capital-spend-verification.module';
import { CapitalAllocationModule } from './capital-allocation/capital-allocation.module';
import { ReinvestmentDecisionEngineModule } from './reinvestment-decision-engine/reinvestment-decision-engine.module';
import { FinancialControlPerformanceModule } from './financial-control-performance/financial-control-performance.module';
import { FinancialControlReportModule } from './financial-control-report/financial-control-report.module';
import { FinancialEscalationsModule } from './financial-escalations/financial-escalations.module';
import { FinancialAuditTrailModule } from './financial-audit-trail/financial-audit-trail.module';
import { FinancialEvidenceModule } from './financial-evidence/financial-evidence.module';
import { FinancialActionCentreModule } from './financial-action-centre/financial-action-centre.module';
import { FinancialGovernanceModule } from './financial-governance/financial-governance.module';
import { FinancialInvestigationModule } from './financial-investigations/financial-investigation.module';
import { FinancialExceptionsModule } from './financial-exceptions/financial-exceptions.module';
import { StatementMatchingModule } from './statement-matching/statement-matching.module';
import { FinancialReconciliationModule } from './financial-reconciliation/financial-reconciliation.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { CorrectiveActionsModule } from './corrective-actions/corrective-actions.module';
import { FieldInspectionsModule } from './field-inspections/field-inspections.module';
import { FieldNavigationModule } from './field-navigation/field-navigation.module';
import { FarmMapModule } from './farm-map/farm-map.module';
import { PhotoEvidenceModule } from './photo-evidence/photo-evidence.module';
import { FieldVerificationModule } from './field-verification/field-verification.module';
import { FinanceModule } from './finance/finance.module';
import { FieldLogsModule } from './field-logs/field-logs.module';
import { TasksModule } from './tasks/tasks.module';
import { VideoEvidenceModule } from './video-evidence/video-evidence.module';
import {Module} from '@nestjs/common';import {MongooseModule} from '@nestjs/mongoose';import {HealthController} from './health.controller';import {PlantationsModule} from './plantations/plantations.module';import {HivesModule} from './hives/hives.module';import {AuthModule} from './auth/auth.module';import {InspectionsModule} from './inspections/inspections.module';import {EvidenceModule} from './evidence/evidence.module';import {AuditModule} from './audit/audit.module';import {DashboardModule} from './dashboard/dashboard.module';import {GrowthModule} from './growth/growth.module';import {HarvestModule} from './harvest/harvest.module';import {RegenerationModule} from './regeneration/regeneration.module';import {NurseryModule} from './nursery/nursery.module';import {WorkforceModule} from './workforce/workforce.module';import {CostIntelligenceModule} from './cost-intelligence/cost-intelligence.module';import {CashflowModule} from './cashflow/cashflow.module';import {InvestmentModule} from './investment/investment.module';import {RiskManagementModule} from './risk-management/risk-management.module';import {MaintenanceModule} from './maintenance/maintenance.module';import {ProcurementModule} from './procurement/procurement.module';import {InventoryControlModule} from './inventory-control/inventory-control.module';import {IntegrationWorkflowsModule} from './integration-workflows/integration-workflows.module';import {ManagementIntelligenceModule} from './management-intelligence/management-intelligence.module';import {DataIntegrityModule} from './data-integrity/data-integrity.module';import {BackupContinuityModule} from './backup-continuity/backup-continuity.module';import {PerformanceStrategyModule} from './performance-strategy/performance-strategy.module';import {PerformanceIntelligenceModule} from './performance-intelligence/performance-intelligence.module';import {AlertCenterModule} from './alert-center/alert-center.module';import {CommandCentreModule} from './command-centre/command-centre.module';import {StandardOperatingProceduresModule} from './standard-operating-procedures/standard-operating-procedures.module';@Module({imports:[SalesModule,InventoryModule,FieldCaptureModule,FieldWorkforceModule,ApiaryActionsModule,ApiaryIntelligenceModule,ApiaryOperationsModule,OrganizationsModule,NotificationPoliciesModule,CaseEvidenceModule, FinancialInvestigationCasesModule, MonthlyFinancialCloseModule, CapitalSpendVerificationModule, CapitalAllocationModule, ReinvestmentDecisionEngineModule, FinancialControlPerformanceModule, FinancialControlReportModule, FinancialEscalationsModule, FinancialAuditTrailModule, FinancialEvidenceModule, FinancialActionCentreModule, FinancialGovernanceModule, FinancialInvestigationModule, FinancialExceptionsModule, StatementMatchingModule, FinancialReconciliationModule, 
    CorrectiveActionsModule,
    FieldInspectionsModule,
    FieldLogsModule,
    TasksModule,
    VideoEvidenceModule,
    FieldNavigationModule,
    FarmMapModule,MongooseModule.forRoot(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/forestos'),AuthModule,PlantationsModule,HivesModule,InspectionsModule,EvidenceModule,AuditModule,DashboardModule,GrowthModule,HarvestModule,RegenerationModule,NurseryModule,WorkforceModule,CostIntelligenceModule,CashflowModule,InvestmentModule,RiskManagementModule,MaintenanceModule,ProcurementModule,InventoryControlModule,IntegrationWorkflowsModule,ManagementIntelligenceModule,DataIntegrityModule,BackupContinuityModule,PerformanceStrategyModule,PerformanceIntelligenceModule,AlertCenterModule,CommandCentreModule,StandardOperatingProceduresModule, RegistryPersistenceModule, FinancialReportsModule, FieldVerificationModule, PhotoEvidenceModule, FinanceModule],controllers:[HealthController]}) export class AppModule{}