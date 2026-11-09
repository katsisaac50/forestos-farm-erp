# ForestOS Phase 102 — API Route Inventory

## Scope and interpretation
- Controller files scanned: **66**
- Route decorators found: **285**
- Routes with an authentication review signal: **184**
- Routes with a tenant-scope review signal: **236**

> These are static heuristic review signals, not confirmed vulnerabilities. A route may be protected by global guards or delegate authorization to a service; conversely, the presence of a guard does not prove correct authorization. Review every flagged route manually and test it at runtime.

## Route register

| Method | Route (static approximation) | Controller | Source | Signals |
|---|---|---|---|---|
| GET | `/alert-center/dashboard` | AlertCenterController | `apps/api/src/alert-center/alert-center.controller.ts:11` | review-tenant-scope |
| POST | `/alert-center/refresh` | AlertCenterController | `apps/api/src/alert-center/alert-center.controller.ts:12` | review-tenant-scope |
| PATCH | `/alert-center/:id/state` | AlertCenterController | `apps/api/src/alert-center/alert-center.controller.ts:13` | review-tenant-scope |
| GET | `/apiary-actions` | ApiaryActionsController | `apps/api/src/apiary-actions/apiary-actions.controller.ts:18` | none detected |
| GET | `/apiary-actions/summary` | ApiaryActionsController | `apps/api/src/apiary-actions/apiary-actions.controller.ts:23` | none detected |
| GET | `/apiary-actions/:id/history` | ApiaryActionsController | `apps/api/src/apiary-actions/apiary-actions.controller.ts:28` | none detected |
| POST | `/apiary-actions` | ApiaryActionsController | `apps/api/src/apiary-actions/apiary-actions.controller.ts:33` | none detected |
| PATCH | `/apiary-actions/:id` | ApiaryActionsController | `apps/api/src/apiary-actions/apiary-actions.controller.ts:39` | none detected |
| GET | `/apiary-intelligence/dashboard` | ApiaryIntelligenceController | `apps/api/src/apiary-intelligence/apiary-intelligence.controller.ts:16` | none detected |
| GET | `/apiary-intelligence/productivity` | ApiaryIntelligenceController | `apps/api/src/apiary-intelligence/apiary-intelligence.controller.ts:20` | none detected |
| GET | `/apiary-operations/inspections` | ApiaryOperationsController | `apps/api/src/apiary-operations/apiary-operations.controller.ts:21` | none detected |
| POST | `/apiary-operations/inspections` | ApiaryOperationsController | `apps/api/src/apiary-operations/apiary-operations.controller.ts:30` | none detected |
| GET | `/apiary-operations/harvests` | ApiaryOperationsController | `apps/api/src/apiary-operations/apiary-operations.controller.ts:40` | none detected |
| POST | `/apiary-operations/harvests` | ApiaryOperationsController | `apps/api/src/apiary-operations/apiary-operations.controller.ts:49` | none detected |
| GET | `/apiary-operations/harvest-summary` | ApiaryOperationsController | `apps/api/src/apiary-operations/apiary-operations.controller.ts:59` | none detected |
| GET | `/audit` | AuditController | `apps/api/src/audit/audit.controller.ts:2` | review-auth-guard, review-tenant-scope |
| POST | `/auth/setup-owner` | AuthController | `apps/api/src/auth/auth.controller.ts:11` | none detected |
| POST | `/auth/login` | AuthController | `apps/api/src/auth/auth.controller.ts:19` | none detected |
| POST | `/auth/users` | AuthController | `apps/api/src/auth/auth.controller.ts:24` | none detected |
| GET | `/auth/me` | AuthController | `apps/api/src/auth/auth.controller.ts:31` | none detected |
| GET | `/backup-continuity/dashboard` | BackupContinuityController | `apps/api/src/backup-continuity/backup-continuity.controller.ts:11` | review-tenant-scope |
| GET | `/backup-continuity/records` | BackupContinuityController | `apps/api/src/backup-continuity/backup-continuity.controller.ts:12` | review-tenant-scope |
| POST | `/backup-continuity/records` | BackupContinuityController | `apps/api/src/backup-continuity/backup-continuity.controller.ts:13` | review-tenant-scope |
| POST | `/backup-continuity/records/:id/verify` | BackupContinuityController | `apps/api/src/backup-continuity/backup-continuity.controller.ts:14` | review-tenant-scope |
| POST | `/backup-continuity/recovery-drill` | BackupContinuityController | `apps/api/src/backup-continuity/backup-continuity.controller.ts:15` | review-tenant-scope |
| GET | `/capital-allocation` | CapitalAllocationController | `apps/api/src/capital-allocation/capital-allocation.controller.ts:8` | review-auth-guard, review-tenant-scope |
| POST | `/capital-allocation/policy` | CapitalAllocationController | `apps/api/src/capital-allocation/capital-allocation.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/capital-allocation/proposals` | CapitalAllocationController | `apps/api/src/capital-allocation/capital-allocation.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/capital-allocation/proposals/:id/review` | CapitalAllocationController | `apps/api/src/capital-allocation/capital-allocation.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/capital-spend-verification/reconciliation` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/capital-spend-verification` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/capital-spend-verification` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/capital-spend-verification/:id/review` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/capital-spend-verification/:id/evidence-reference` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/capital-spend-verification/:id/correction-request` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:13` | review-auth-guard, review-tenant-scope |
| POST | `/capital-spend-verification/:id/reversal` | CapitalSpendVerificationController | `apps/api/src/capital-spend-verification/capital-spend-verification.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/upload` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/:id/download` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:17` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-escalations/provider-health` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:26` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-escalations/events/:id/replay` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:28` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-escalations/scheduler-status` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:30` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-escalations/run` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:32` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-escalations/events` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:34` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-escalations/audit-summary` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:36` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-escalations/delivery-status` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:38` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-escalations/deliver` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:40` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-escalations/retry-failed` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:42` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-alerts` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:44` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/recovery-incidents` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:46` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-incidents` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:48` | review-auth-guard, review-tenant-scope |
| PATCH | `/case-evidence/recovery-incidents/:id` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:50` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-incidents/:id/approve` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:52` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/recovery-incidents/:id/close` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:54` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/operations/health` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:56` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/operations/reconcile` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:58` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:63` | review-auth-guard, review-tenant-scope |
| GET | `/case-evidence/:id/history` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:64` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/:id/review` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:65` | review-auth-guard, review-tenant-scope |
| POST | `/case-evidence/:id/quarantine` | CaseEvidenceController | `apps/api/src/case-evidence/case-evidence.controller.ts:66` | review-auth-guard, review-tenant-scope |
| GET | `/cashflow/dashboard` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/cashflow/positions` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/cashflow/positions` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/cashflow/plans` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/cashflow/plans` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/cashflow/decisions` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/cashflow/decisions` | CashflowController | `apps/api/src/cashflow/cashflow.controller.ts:15` | review-auth-guard, review-tenant-scope |
| GET | `/command-centre/dashboard` | CommandCentreController | `apps/api/src/command-centre/command-centre.controller.ts:11` | review-tenant-scope |
| GET | `/corrective-actions` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:9` | review-tenant-scope |
| GET | `/corrective-actions/analytics` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:10` | review-tenant-scope |
| POST | `/corrective-actions` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:11` | review-tenant-scope |
| POST | `/corrective-actions/from-inspection/:inspectionId` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:12` | review-tenant-scope |
| POST | `/corrective-actions/:id/update` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:13` | review-tenant-scope |
| POST | `/corrective-actions/:id/review` | CorrectiveActionsController | `apps/api/src/corrective-actions/corrective-actions.controller.ts:14` | review-tenant-scope |
| GET | `/cost-intelligence/dashboard` | CostIntelligenceController | `apps/api/src/cost-intelligence/cost-intelligence.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/cost-intelligence/plans` | CostIntelligenceController | `apps/api/src/cost-intelligence/cost-intelligence.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/cost-intelligence/plans` | CostIntelligenceController | `apps/api/src/cost-intelligence/cost-intelligence.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/cost-intelligence/allocations` | CostIntelligenceController | `apps/api/src/cost-intelligence/cost-intelligence.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/cost-intelligence/allocations` | CostIntelligenceController | `apps/api/src/cost-intelligence/cost-intelligence.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/dashboard/summary` | DashboardController | `apps/api/src/dashboard/dashboard.controller.ts:5` | review-auth-guard, review-tenant-scope |
| GET | `/data-integrity/report` | DataIntegrityController | `apps/api/src/data-integrity/data-integrity.controller.ts:11` | review-tenant-scope |
| GET | `/evidence` | EvidenceController | `apps/api/src/evidence/evidence.controller.ts:6` | review-auth-guard, review-tenant-scope |
| POST | `/evidence` | EvidenceController | `apps/api/src/evidence/evidence.controller.ts:7` | review-auth-guard, review-tenant-scope |
| GET | `/evidence/:id/image` | EvidenceController | `apps/api/src/evidence/evidence.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/farm-map` | FarmMapController | `apps/api/src/farm-map/farm-map.controller.ts:10` | review-tenant-scope |
| POST | `/farm-map` | FarmMapController | `apps/api/src/farm-map/farm-map.controller.ts:11` | review-tenant-scope |
| POST | `/farm-map/:id/archive` | FarmMapController | `apps/api/src/farm-map/farm-map.controller.ts:14` | review-tenant-scope |
| POST | `/field-capture` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:19` | none detected |
| POST | `/field-capture/:id/evidence` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:24` | none detected |
| GET | `/field-capture/:id/evidence/:evidenceId` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:31` | none detected |
| DELETE | `/field-capture/:id/evidence/:evidenceId` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:44` | none detected |
| GET | `/field-capture/governance/summary` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:54` | none detected |
| GET | `/field-capture` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:59` | none detected |
| PATCH | `/field-capture/:id/review` | FieldCaptureController | `apps/api/src/field-capture/field-capture.controller.ts:63` | none detected |
| GET | `/field-inspections` | FieldInspectionsController | `apps/api/src/field-inspections/field-inspections.controller.ts:11` | review-tenant-scope |
| POST | `/field-inspections` | FieldInspectionsController | `apps/api/src/field-inspections/field-inspections.controller.ts:16` | review-tenant-scope |
| POST | `/field-inspections/:id/submit` | FieldInspectionsController | `apps/api/src/field-inspections/field-inspections.controller.ts:21` | review-tenant-scope |
| POST | `/field-inspections/:id/review` | FieldInspectionsController | `apps/api/src/field-inspections/field-inspections.controller.ts:26` | review-tenant-scope |
| GET | `/field-logs` | FieldLogsController | `apps/api/src/field-logs/field-logs.controller.ts:4` | review-auth-guard, review-tenant-scope |
| POST | `/field-logs` | FieldLogsController | `apps/api/src/field-logs/field-logs.controller.ts:5` | review-auth-guard, review-tenant-scope |
| PATCH | `/field-logs/:id` | FieldLogsController | `apps/api/src/field-logs/field-logs.controller.ts:6` | review-auth-guard, review-tenant-scope |
| GET | `/field-navigation` | FieldNavigationController | `apps/api/src/field-navigation/field-navigation.controller.ts:12` | review-tenant-scope |
| POST | `/field-navigation` | FieldNavigationController | `apps/api/src/field-navigation/field-navigation.controller.ts:17` | review-tenant-scope |
| POST | `/field-navigation/:id/archive` | FieldNavigationController | `apps/api/src/field-navigation/field-navigation.controller.ts:25` | review-tenant-scope |
| GET | `/field-verification` | FieldVerificationController | `apps/api/src/field-verification/field-verification.controller.ts:10` | review-tenant-scope |
| POST | `/field-verification` | FieldVerificationController | `apps/api/src/field-verification/field-verification.controller.ts:15` | review-tenant-scope |
| PATCH | `/field-verification/:id/approve` | FieldVerificationController | `apps/api/src/field-verification/field-verification.controller.ts:20` | review-tenant-scope |
| PATCH | `/field-verification/:id/reject` | FieldVerificationController | `apps/api/src/field-verification/field-verification.controller.ts:23` | review-tenant-scope |
| GET | `/field-workforce/workers` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:17` | none detected |
| POST | `/field-workforce/workers` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:21` | none detected |
| GET | `/field-workforce/tasks` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:26` | none detected |
| POST | `/field-workforce/tasks` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:30` | none detected |
| PATCH | `/field-workforce/tasks/:id/status` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:35` | none detected |
| GET | `/field-workforce/tasks/summary` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:40` | none detected |
| GET | `/field-workforce/tasks/:id/history` | FieldWorkforceController | `apps/api/src/field-workforce/field-workforce.controller.ts:44` | none detected |
| GET | `/finance` | FinanceController | `apps/api/src/finance/finance.controller.ts:11` | review-auth-guard, review-tenant-scope |
| POST | `/finance` | FinanceController | `apps/api/src/finance/finance.controller.ts:16` | review-auth-guard, review-tenant-scope |
| PATCH | `/finance/:id` | FinanceController | `apps/api/src/finance/finance.controller.ts:21` | review-auth-guard, review-tenant-scope |
| GET | `/financial-action-centre` | FinancialActionCentreController | `apps/api/src/financial-action-centre/financial-action-centre.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-action-centre/:actionId` | FinancialActionCentreController | `apps/api/src/financial-action-centre/financial-action-centre.controller.ts:14` | review-auth-guard, review-tenant-scope |
| GET | `/financial-audit-trail` | FinancialAuditTrailController | `apps/api/src/financial-audit-trail/financial-audit-trail.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/financial-control-performance` | FinancialControlPerformanceController | `apps/api/src/financial-control-performance/financial-control-performance.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/financial-control-report` | FinancialControlReportController | `apps/api/src/financial-control-report/financial-control-report.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/financial-escalations` | FinancialEscalationsController | `apps/api/src/financial-escalations/financial-escalations.controller.ts:9` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-escalations/:escalationId` | FinancialEscalationsController | `apps/api/src/financial-escalations/financial-escalations.controller.ts:10` | review-auth-guard, review-tenant-scope |
| GET | `/financial-evidence` | FinancialEvidenceController | `apps/api/src/financial-evidence/financial-evidence.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/financial-evidence` | FinancialEvidenceController | `apps/api/src/financial-evidence/financial-evidence.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-evidence/:evidenceId/review` | FinancialEvidenceController | `apps/api/src/financial-evidence/financial-evidence.controller.ts:12` | review-auth-guard, review-tenant-scope |
| GET | `/financial-exceptions` | FinancialExceptionsController | `apps/api/src/financial-exceptions/financial-exceptions.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/financial-governance` | FinancialGovernanceController | `apps/api/src/financial-governance/financial-governance.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/financial-investigation-cases` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/financial-investigation-cases/:id` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/financial-investigation-cases` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-investigation-cases/:id` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/financial-investigation-cases/:id/second-review` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:13` | review-auth-guard, review-tenant-scope |
| POST | `/financial-investigation-cases/:id/reopen` | FinancialInvestigationCasesController | `apps/api/src/financial-investigation-cases/financial-investigation-cases.controller.ts:14` | review-auth-guard, review-tenant-scope |
| GET | `/financial-investigations` | FinancialInvestigationController | `apps/api/src/financial-investigations/financial-investigation.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/financial-investigations` | FinancialInvestigationController | `apps/api/src/financial-investigations/financial-investigation.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-investigations/:id` | FinancialInvestigationController | `apps/api/src/financial-investigations/financial-investigation.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/financial-reconciliation` | FinancialReconciliationController | `apps/api/src/financial-reconciliation/financial-reconciliation.controller.ts:11` | review-auth-guard, review-tenant-scope |
| POST | `/financial-reconciliation` | FinancialReconciliationController | `apps/api/src/financial-reconciliation/financial-reconciliation.controller.ts:14` | review-auth-guard, review-tenant-scope |
| PATCH | `/financial-reconciliation/:id/review` | FinancialReconciliationController | `apps/api/src/financial-reconciliation/financial-reconciliation.controller.ts:19` | review-auth-guard, review-tenant-scope |
| GET | `/financial-reports/monthly` | FinancialReportsController | `apps/api/src/financial-reports/financial-reports.controller.ts:10` | review-auth-guard, review-tenant-scope |
| GET | `/growth` | GrowthController | `apps/api/src/growth/growth.controller.ts:14` | none detected |
| POST | `/growth` | GrowthController | `apps/api/src/growth/growth.controller.ts:17` | none detected |
| GET | `/growth/trend` | GrowthController | `apps/api/src/growth/growth.controller.ts:22` | none detected |
| GET | `/harvest/plans` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/harvest/plans` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/harvest/plans/:id` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/harvest/quotes` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/harvest/quotes` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/harvest/costs` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/harvest/costs` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:15` | review-auth-guard, review-tenant-scope |
| GET | `/harvest/scenario/:planId` | HarvestController | `apps/api/src/harvest/harvest.controller.ts:16` | review-auth-guard, review-tenant-scope |
| GET | `/health` | HealthController | `apps/api/src/health.controller.ts:7` | none detected |
| GET | `/health/ready` | HealthController | `apps/api/src/health.controller.ts:13` | none detected |
| GET | `/hives` | HivesController | `apps/api/src/hives/hives.controller.ts:22` | none detected |
| POST | `/hives` | HivesController | `apps/api/src/hives/hives.controller.ts:27` | none detected |
| PATCH | `/hives/:id` | HivesController | `apps/api/src/hives/hives.controller.ts:36` | none detected |
| GET | `/inspections` | InspectionsController | `apps/api/src/inspections/inspections.controller.ts:8` | review-auth-guard, review-tenant-scope |
| POST | `/inspections` | InspectionsController | `apps/api/src/inspections/inspections.controller.ts:9` | review-auth-guard, review-tenant-scope |
| PATCH | `/inspections/:id` | InspectionsController | `apps/api/src/inspections/inspections.controller.ts:10` | review-auth-guard, review-tenant-scope |
| GET | `/integration-workflows/dashboard` | IntegrationWorkflowsController | `apps/api/src/integration-workflows/integration-workflows.controller.ts:11` | review-tenant-scope |
| GET | `/integration-workflows/events` | IntegrationWorkflowsController | `apps/api/src/integration-workflows/integration-workflows.controller.ts:12` | review-tenant-scope |
| POST | `/integration-workflows/events` | IntegrationWorkflowsController | `apps/api/src/integration-workflows/integration-workflows.controller.ts:13` | review-tenant-scope |
| POST | `/integration-workflows/events/:id/process` | IntegrationWorkflowsController | `apps/api/src/integration-workflows/integration-workflows.controller.ts:14` | review-tenant-scope |
| POST | `/integration-workflows/events/:id/cancel` | IntegrationWorkflowsController | `apps/api/src/integration-workflows/integration-workflows.controller.ts:15` | review-tenant-scope |
| GET | `/inventory-control/dashboard` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/inventory-control/items` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/inventory-control/items` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/inventory-control/items/:id` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/inventory-control/movements` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/inventory-control/movements` | InventoryControlController | `apps/api/src/inventory-control/inventory-control.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/inventory` | InventoryController | `apps/api/src/inventory/inventory.controller.ts:2` | review-auth-guard, review-tenant-scope |
| POST | `/inventory` | InventoryController | `apps/api/src/inventory/inventory.controller.ts:2` | review-auth-guard, review-tenant-scope |
| PATCH | `/inventory/:id` | InventoryController | `apps/api/src/inventory/inventory.controller.ts:2` | review-auth-guard, review-tenant-scope |
| GET | `/investment/dashboard` | InvestmentController | `apps/api/src/investment/investment.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/investment/scenarios` | InvestmentController | `apps/api/src/investment/investment.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/investment/scenarios` | InvestmentController | `apps/api/src/investment/investment.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/investment/scenarios/:id/status` | InvestmentController | `apps/api/src/investment/investment.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/investment/decisions` | InvestmentController | `apps/api/src/investment/investment.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/maintenance/dashboard` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/maintenance/assets` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/maintenance/assets` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/maintenance/assets/:id` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/maintenance/records` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/maintenance/records` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:13` | review-auth-guard, review-tenant-scope |
| PATCH | `/maintenance/records/:id` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:14` | review-auth-guard, review-tenant-scope |
| GET | `/maintenance/parts` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:15` | review-auth-guard, review-tenant-scope |
| POST | `/maintenance/parts` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:16` | review-auth-guard, review-tenant-scope |
| PATCH | `/maintenance/parts/:id` | MaintenanceController | `apps/api/src/maintenance/maintenance.controller.ts:17` | review-auth-guard, review-tenant-scope |
| GET | `/management-intelligence/dashboard` | ManagementIntelligenceController | `apps/api/src/management-intelligence/management-intelligence.controller.ts:11` | review-tenant-scope |
| GET | `/monthly-financial-close` | MonthlyFinancialCloseController | `apps/api/src/monthly-financial-close/monthly-financial-close.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/monthly-financial-close/versions/:month` | MonthlyFinancialCloseController | `apps/api/src/monthly-financial-close/monthly-financial-close.controller.ts:16` | review-auth-guard, review-tenant-scope |
| POST | `/monthly-financial-close` | MonthlyFinancialCloseController | `apps/api/src/monthly-financial-close/monthly-financial-close.controller.ts:19` | review-auth-guard, review-tenant-scope |
| PATCH | `/monthly-financial-close/:id/review` | MonthlyFinancialCloseController | `apps/api/src/monthly-financial-close/monthly-financial-close.controller.ts:24` | review-auth-guard, review-tenant-scope |
| PATCH | `/monthly-financial-close/:id/reopen` | MonthlyFinancialCloseController | `apps/api/src/monthly-financial-close/monthly-financial-close.controller.ts:29` | review-auth-guard, review-tenant-scope |
| POST | `/notification-policies/evaluate` | NotificationPoliciesController | `apps/api/src/notification-policies/notification-policies.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/notification-policies` | NotificationPoliciesController | `apps/api/src/notification-policies/notification-policies.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/notification-policies` | NotificationPoliciesController | `apps/api/src/notification-policies/notification-policies.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/notification-policies/:policyKey` | NotificationPoliciesController | `apps/api/src/notification-policies/notification-policies.controller.ts:12` | review-auth-guard, review-tenant-scope |
| GET | `/notification-policies/:policyKey/history` | NotificationPoliciesController | `apps/api/src/notification-policies/notification-policies.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/nursery/dashboard` | NurseryController | `apps/api/src/nursery/nursery.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/nursery/batches` | NurseryController | `apps/api/src/nursery/nursery.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/nursery/batches` | NurseryController | `apps/api/src/nursery/nursery.controller.ts:10` | review-auth-guard, review-tenant-scope |
| GET | `/nursery/movements` | NurseryController | `apps/api/src/nursery/nursery.controller.ts:11` | review-auth-guard, review-tenant-scope |
| POST | `/nursery/movements` | NurseryController | `apps/api/src/nursery/nursery.controller.ts:12` | review-auth-guard, review-tenant-scope |
| GET | `/organization-access/mine` | OrganizationAccessController | `apps/api/src/organizations/organization-access.controller.ts:22` | none detected |
| GET | `/organization-access/context` | OrganizationAccessController | `apps/api/src/organizations/organization-access.controller.ts:29` | none detected |
| GET | `/organizations` | OrganizationsController | `apps/api/src/organizations/organizations.controller.ts:5` | review-auth-guard |
| POST | `/organizations` | OrganizationsController | `apps/api/src/organizations/organizations.controller.ts:6` | review-auth-guard |
| POST | `/organizations/memberships` | OrganizationsController | `apps/api/src/organizations/organizations.controller.ts:7` | review-auth-guard |
| GET | `/organizations/:id/memberships` | OrganizationsController | `apps/api/src/organizations/organizations.controller.ts:8` | review-auth-guard |
| GET | `/organizations/:id/audit` | OrganizationsController | `apps/api/src/organizations/organizations.controller.ts:9` | review-auth-guard |
| GET | `/performance-intelligence/catalog` | PerformanceIntelligenceController | `apps/api/src/performance-intelligence/performance-intelligence.controller.ts:11` | review-tenant-scope |
| POST | `/performance-intelligence/apply` | PerformanceIntelligenceController | `apps/api/src/performance-intelligence/performance-intelligence.controller.ts:12` | review-tenant-scope |
| GET | `/performance-strategy/dashboard` | PerformanceStrategyController | `apps/api/src/performance-strategy/performance-strategy.controller.ts:11` | review-tenant-scope |
| POST | `/performance-strategy/targets` | PerformanceStrategyController | `apps/api/src/performance-strategy/performance-strategy.controller.ts:12` | review-tenant-scope |
| PATCH | `/performance-strategy/targets/:id` | PerformanceStrategyController | `apps/api/src/performance-strategy/performance-strategy.controller.ts:13` | review-tenant-scope |
| POST | `/performance-strategy/targets/:id/updates` | PerformanceStrategyController | `apps/api/src/performance-strategy/performance-strategy.controller.ts:14` | review-tenant-scope |
| GET | `/performance-strategy/targets/:id/history` | PerformanceStrategyController | `apps/api/src/performance-strategy/performance-strategy.controller.ts:15` | review-tenant-scope |
| GET | `/photo-evidence` | PhotoEvidenceController | `apps/api/src/photo-evidence/photo-evidence.controller.ts:16` | review-tenant-scope |
| POST | `/photo-evidence/upload` | PhotoEvidenceController | `apps/api/src/photo-evidence/photo-evidence.controller.ts:17` | review-tenant-scope |
| GET | `/photo-evidence/:id/file` | PhotoEvidenceController | `apps/api/src/photo-evidence/photo-evidence.controller.ts:23` | review-tenant-scope |
| PATCH | `/photo-evidence/:id/approve` | PhotoEvidenceController | `apps/api/src/photo-evidence/photo-evidence.controller.ts:30` | review-tenant-scope |
| PATCH | `/photo-evidence/:id/reject` | PhotoEvidenceController | `apps/api/src/photo-evidence/photo-evidence.controller.ts:31` | review-tenant-scope |
| GET | `/plantations` | PlantationsController | `apps/api/src/plantations/plantations.controller.ts:23` | none detected |
| GET | `/plantations/intelligence` | PlantationsController | `apps/api/src/plantations/plantations.controller.ts:29` | none detected |
| POST | `/plantations` | PlantationsController | `apps/api/src/plantations/plantations.controller.ts:36` | none detected |
| PATCH | `/plantations/:id` | PlantationsController | `apps/api/src/plantations/plantations.controller.ts:47` | none detected |
| GET | `/procurement/dashboard` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/procurement/suppliers` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/procurement/suppliers` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/procurement/suppliers/:id` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/procurement/requests` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/procurement/requests` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:13` | review-auth-guard, review-tenant-scope |
| PATCH | `/procurement/requests/:id` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:14` | review-auth-guard, review-tenant-scope |
| GET | `/procurement/orders` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:15` | review-auth-guard, review-tenant-scope |
| POST | `/procurement/orders` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:16` | review-auth-guard, review-tenant-scope |
| PATCH | `/procurement/orders/:id` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:17` | review-auth-guard, review-tenant-scope |
| GET | `/procurement/receipts` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:18` | review-auth-guard, review-tenant-scope |
| POST | `/procurement/receipts` | ProcurementController | `apps/api/src/procurement/procurement.controller.ts:19` | review-auth-guard, review-tenant-scope |
| GET | `/regeneration/dashboard` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/regeneration/plans` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/regeneration/plans` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:10` | review-auth-guard, review-tenant-scope |
| PATCH | `/regeneration/plans/:id` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/regeneration/costs` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:12` | review-auth-guard, review-tenant-scope |
| POST | `/regeneration/costs` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/regeneration/survival-checks` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/regeneration/survival-checks` | RegenerationController | `apps/api/src/regeneration/regeneration.controller.ts:15` | review-auth-guard, review-tenant-scope |
| GET | `/reinvestment-decision-engine` | ReinvestmentDecisionEngineController | `apps/api/src/reinvestment-decision-engine/reinvestment-decision-engine.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/risk-management/dashboard` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:9` | review-auth-guard, review-tenant-scope |
| GET | `/risk-management/risks` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:10` | review-auth-guard, review-tenant-scope |
| POST | `/risk-management/risks` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:11` | review-auth-guard, review-tenant-scope |
| PATCH | `/risk-management/risks/:id` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:12` | review-auth-guard, review-tenant-scope |
| GET | `/risk-management/actions` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:13` | review-auth-guard, review-tenant-scope |
| POST | `/risk-management/actions` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:14` | review-auth-guard, review-tenant-scope |
| PATCH | `/risk-management/actions/:id` | RiskManagementController | `apps/api/src/risk-management/risk-management.controller.ts:15` | review-auth-guard, review-tenant-scope |
| GET | `/sales` | SalesController | `apps/api/src/sales/sales.controller.ts:2` | review-auth-guard, review-tenant-scope |
| POST | `/sales` | SalesController | `apps/api/src/sales/sales.controller.ts:2` | review-auth-guard, review-tenant-scope |
| PATCH | `/sales/:id` | SalesController | `apps/api/src/sales/sales.controller.ts:2` | review-auth-guard, review-tenant-scope |
| GET | `/sops/overview` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:10` | review-tenant-scope |
| GET | `/sops/templates` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:11` | review-tenant-scope |
| POST | `/sops/seed-defaults` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:12` | review-tenant-scope |
| POST | `/sops/templates` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:13` | review-tenant-scope |
| PATCH | `/sops/templates/:id/status` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:14` | review-tenant-scope |
| GET | `/sops/my-runs` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:16` | review-tenant-scope |
| GET | `/sops/runs` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:21` | review-tenant-scope |
| POST | `/sops/runs` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:22` | review-tenant-scope |
| PATCH | `/sops/runs/:id` | StandardOperatingProceduresController | `apps/api/src/standard-operating-procedures/standard-operating-procedures.controller.ts:23` | review-tenant-scope |
| GET | `/statement-matching/imports` | StatementMatchingController | `apps/api/src/statement-matching/statement-matching.controller.ts:11` | review-auth-guard, review-tenant-scope |
| GET | `/statement-matching/imports/:importId` | StatementMatchingController | `apps/api/src/statement-matching/statement-matching.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/statement-matching/imports` | StatementMatchingController | `apps/api/src/statement-matching/statement-matching.controller.ts:17` | review-auth-guard, review-tenant-scope |
| GET | `/statement-matching/imports/:importId/rows/:rowId/candidates` | StatementMatchingController | `apps/api/src/statement-matching/statement-matching.controller.ts:23` | review-auth-guard, review-tenant-scope |
| POST | `/statement-matching/imports/:importId/rows/:rowId/decision` | StatementMatchingController | `apps/api/src/statement-matching/statement-matching.controller.ts:28` | review-auth-guard, review-tenant-scope |
| GET | `/tasks` | TasksController | `apps/api/src/tasks/tasks.controller.ts:2` | review-auth-guard, review-tenant-scope |
| POST | `/tasks` | TasksController | `apps/api/src/tasks/tasks.controller.ts:2` | review-auth-guard, review-tenant-scope |
| PATCH | `/tasks/:id` | TasksController | `apps/api/src/tasks/tasks.controller.ts:2` | review-auth-guard, review-tenant-scope |
| GET | `/workforce/dashboard` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:8` | review-auth-guard, review-tenant-scope |
| GET | `/workforce/workers` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:9` | review-auth-guard, review-tenant-scope |
| POST | `/workforce/workers` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:10` | review-auth-guard, review-tenant-scope |
| GET | `/workforce/tasks` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:11` | review-auth-guard, review-tenant-scope |
| POST | `/workforce/tasks` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:12` | review-auth-guard, review-tenant-scope |
| PATCH | `/workforce/tasks/:id` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:13` | review-auth-guard, review-tenant-scope |
| GET | `/workforce/entries` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:14` | review-auth-guard, review-tenant-scope |
| POST | `/workforce/entries` | WorkforceController | `apps/api/src/workforce/workforce.controller.ts:15` | review-auth-guard, review-tenant-scope |

## Required audit workflow
1. Confirm the route path and HTTP method against the running Nest application.
2. Trace controller -> service -> database query, including aggregation, exports, and nested references.
3. Confirm authentication, active organization membership, role authorization, and trusted organization scope.
4. Exercise cross-tenant ID guessing, bulk updates/deletes, report/export access, and inactive memberships.
5. Record evidence, severity, owner, fix, and retest result for each issue.

## Limitations
- Decorator parsing is regex-based and may miss dynamically composed decorators, multiline edge cases, inherited/global guards, and routes created outside controller files.
- Route strings are approximations; parameter expressions and prefixes may not be fully resolved.
- No endpoint was invoked and no database was accessed by this generator.
- The inventory is a starting point for enterprise-grade security review, not a security certification.
