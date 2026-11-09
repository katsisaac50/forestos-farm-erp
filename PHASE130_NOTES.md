# Phase 130 — Inventory Migration Execution Safeguards

## Scope
This phase adds a pre-execution evidence guard for a future inventory ownership migration. It validates the Phase 129 rehearsal report, explicit approval record, backup/restore evidence, and a plan-only operation manifest. It is intentionally not a migration executor and has no MongoDB connection.

## Inputs
The guard accepts four JSON files:
1. Phase 129 rehearsal report.
2. Authorization record, e.g. `{"approvalStatus":"approved","approvedBy":"reviewer-1","changeTicket":"CHG-130","approvedAt":"2026-10-27T09:00:00Z","environment":"staging"}`.
3. Backup evidence, e.g. `{"backupStatus":"verified","backupReference":"backup-130","verifiedBy":"operator-2","verifiedAt":"2026-10-27T09:10:00Z","restoreTestStatus":"passed","restoreEvidenceRef":"restore-test-130"}`.
4. Plan-only manifest, e.g. `{"schemaVersion":1,"mode":"PLAN_ONLY","mutationEnabled":false,"operations":[{"recordType":"stockItem","recordId":"item-1","field":"organizationId","from":null,"to":"aaaaaaaaaaaaaaaaaaaaaaaa"}]}`.

Example command from `apps/api`:
```sh
node ../../scripts/phase130-inventory-migration-execution-guard.js rehearsal.json authorization.json backup-evidence.json plan.json
node ../../scripts/phase130-inventory-migration-execution-guard-contract-tests.js
```
The guard writes `phase130-execution-guard-report.json` to the current working directory. Exit code 3 means blockers; 2 means usage or input error; 0 means evidence and plan shape passed validation.

## Safety guarantees
- The input plan must use `PLAN_ONLY` and `mutationEnabled: false`.
- Production target environments are rejected.
- The output always sets `mayExecuteMigration: false` and `mayTargetProduction: false`, even when all checks pass.
- Hashes are recorded for the four input artifacts.
- A passing guard is not a substitute for independent review, environment validation, backup restoration proof, index inspection, or an implementation-specific rollback plan.
- Do not put secrets or credentials in these JSON artifacts.

## Validation
Dependency-free contract tests are included. This phase does not run against live MongoDB and does not build the NestJS/Next.js applications or perform HTTP integration tests.
