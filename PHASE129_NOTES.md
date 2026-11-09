# Phase 129 — Inventory Migration Rehearsal & Rollback Verification

## Purpose
This phase extends Phase 128's offline inventory ownership preflight with a repeatable in-memory migration rehearsal. It simulates proposed `organizationId` assignments, checks source counts and ownership integrity, hashes the input artifacts, and writes a rollback manifest. It does not connect to MongoDB and does not perform writes.

## Input format
Export JSON:
```json
{
  "stockItems": [{"_id":"item-1","itemCode":"SEED-1","organizationId":""}],
  "stockMovements": [{"_id":"move-1","itemId":"item-1","movementCode":"MV-1","organizationId":""}]
}
```
Ownership manifest:
```json
{
  "approvals": [
    {"recordType":"stockItem","recordId":"item-1","organizationId":"aaaaaaaaaaaaaaaaaaaaaaaa","approvedBy":"reviewer","evidenceRef":"CHANGE-123"}
  ]
}
```
Optional baseline JSON:
```json
{"stockItems": 1, "stockMovements": 1}
```
The baseline compares expected source counts to the export counts. Organization IDs must be 24-character hexadecimal MongoDB ObjectId strings.

## Run
From `apps/api`:
```sh
node ../../scripts/phase129-inventory-migration-rehearsal.js export.json ownership-manifest.json baseline.json ./migration-rehearsal-output
node ../../scripts/phase129-inventory-migration-rehearsal-contract-tests.js
```
Omit `baseline.json` if no trusted baseline exists. When supplying a baseline and output directory, both must be supplied in that order. Exit code `3` means blockers were found; `2` means usage or input error; `0` means the offline rehearsal found no blockers.

Output files:
- `phase129-rehearsal-report.json`: counts, proposed ownership changes, findings, source artifact hashes, and closed release gate.
- `phase129-rollback-manifest.json`: original values and proposed values for each simulated assignment. This is a planning artifact, not an executable rollback.

## Safety gates
- `releaseGate.mayApplyMigration` is always `false`.
- A clean rehearsal is not authorization to migrate.
- Have an independent reviewer verify the export completeness, approvals, index state, backups, deployment plan, and rollback rehearsal before any separately implemented migration is approved.
- Do not apply the rollback manifest directly; it is evidence for a future reviewed migration/rollback implementation.
- Existing legacy unique indexes and concurrent stock update semantics remain separate unresolved risks.

## Validation performed for this archive
The Phase 129 dependency-free contract tests were run, plus regression contract tests for prior phases where available. ZIP integrity was checked. No live MongoDB, production data, migration, NestJS build, web build, or HTTP integration tests were run.
