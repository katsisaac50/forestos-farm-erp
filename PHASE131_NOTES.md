# Phase 131 — Inventory Migration Reconciliation & Observability

## Purpose
This phase adds an offline before/after export comparison for inventory migration verification. It reports source record counts, organization-level counts, record additions/removals, ownership changes, numeric quantity/cost differences, and movement-to-parent ownership conflicts. SHA-256 hashes of both input artifacts are included.

## Input shape
Both before and after JSON files must contain arrays named `stockItems` and `stockMovements`. Each row should include `_id` and `organizationId`. Movement rows should include `itemId`. Optional numeric fields checked when present include stock item `quantityOnHand`, `quantity`, `unitCost`, `averageCost`, `totalValue` and movement `quantity`, `unitCost`, `totalCost`.

## Run
From `apps/api`:
```sh
node ../../scripts/phase131-inventory-migration-reconciliation.js before.json after.json ./reconciliation-output
node ../../scripts/phase131-inventory-migration-reconciliation-contract-tests.js
```
Exit code 0 means no reconciliation blockers were found; 3 means blockers were found; 2 means usage/input error. Output is `phase131-reconciliation-report.json`.

## Interpretation and safety
- Ownership-only changes are reported separately from numeric differences.
- Missing/unexpected records, duplicate IDs, invalid numeric values, unassigned/missing movement parents, and parent/child organization conflicts are blockers.
- Numeric differences are reported for review and are not automatically classified as errors, because legitimate transactions may change quantities or costs. Compare them against the approved migration/change window and movement ledger.
- `migrationAuthorized` and `rollbackAutomaticallyAuthorized` are always false.
- This is an offline export comparator only. It does not read or write MongoDB, validate the authenticity of exports, or authorize migration/rollback.

## Validation performed
Dependency-free contract tests and prior migration/inventory contract tests were run. No live database migration, full NestJS/Next.js build, or HTTP integration tests were run.
