# Phase 128 — Inventory Control Migration Preflight

## Purpose
A read-only gate before applying tenant ownership to legacy Inventory Control data. Default operation is offline: it reads an export and an explicit ownership manifest and prints a proposed plan. It never writes to MongoDB.

## Offline input format
Export:
```json
{
  "stockItems": [{"_id":"<record id>","itemCode":"SEED-1","organizationId":""}],
  "stockMovements": [{"_id":"<record id>","itemId":"<stock item id>","movementCode":"MV-1","organizationId":""}]
}
```
Manifest:
```json
{
  "approvals": [
    {"recordType":"stockItem","recordId":"<record id>","organizationId":"<24-char ObjectId>","approvedBy":"reviewer","evidenceRef":"ticket-or-document-reference"}
  ]
}
```
A movement's organization should be inherited from a verified parent stock item. If movement-level approval is provided, it must agree with the parent. Item ownership requires explicit approval.

## Run offline preflight
From `apps/api`:
`node ../../scripts/phase128-inventory-migration-preflight.js <export.json> <ownership-manifest.json>`

Exit code 3 indicates blockers or duplicate/integrity findings; 2 indicates usage/input invocation errors. Output is a proposed plan only.

## Optional live index inventory
Only when explicitly requested, with a non-production connection:
`FORESTOS_MONGO_URI=<non-production-uri> node ../../scripts/phase128-inventory-migration-preflight.js --live-indexes`
Optional `FORESTOS_MONGO_DB` can select the database. This operation only calls `listIndexes()` for conventional collection names `stockitems` and `stockmovements`; confirm actual collection names in the target deployment. No live inspection was executed during this phase.

## Safety gates
- Never infer item ownership from the currently logged-in user.
- Resolve every movement through a verified parent item.
- Quarantine orphan movements, ambiguous ownership, duplicate tenant codes, and conflicts.
- Inspect actual live indexes before adding/dropping indexes. In particular, the old global itemCode index may remain after the schema change.
- Back up and verify restore, rehearse on a non-production copy, compare record counts, and obtain explicit approval.
- This tool is not a migration executor. `releaseGate.mayApplyMigration` is always false.

## Validation limits
Contract tests are dependency-free logic tests using sample JSON in memory. No MongoDB connection, data export, index inspection, mutation, NestJS build, or HTTP integration test was performed.
