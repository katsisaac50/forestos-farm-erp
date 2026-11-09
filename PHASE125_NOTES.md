# Phase 125 — MongoDB Schema and Index Migration Readiness

## Purpose
Read-only static review of tenant-owned Sales, Inventory, and Inventory Control schema declarations before any database/index migration.

## What this phase does
- Reviews source declarations for tenant ownership fields.
- Checks for recognizable tenant-aware compound unique indexes.
- Flags global unique declarations that may conflict with tenant-local identifiers.
- Writes `PHASE125_SCHEMA_INDEX_READINESS.json` when the audit is run.
- Adds dependency-free source contract checks.

## What it does not do
- It does not connect to MongoDB.
- It does not list live indexes or inspect production records.
- It does not create, drop, or alter indexes.
- It does not establish that a flagged pattern is a production vulnerability.

## Run
From `ForestOS_Phase13_Workforce_Labour_Productivity/apps/api`:

```bash
npm run audit:phase125:schema-index
npm run test:phase125:contract
```

The audit writes its report to the project root. Review it with the actual MongoDB `listIndexes` output from a secured non-production environment.

## Mandatory next steps before a live migration
1. Take and restore-test a database backup.
2. Export actual index definitions from each target collection.
3. Identify duplicate values under the proposed tenant-local uniqueness rule.
4. Verify ownership assignments against reliable evidence.
5. Rehearse compound-index creation and rollback on a restored non-production copy.
6. Obtain explicit approval before dropping or replacing any index.

## Static findings observed during this source review
- SalesOrder declares `organizationId + orderId` compound unique index.
- InventoryItem declares `organizationId + itemId` compound unique index.
- The separate `inventory-control` StockItem schema declares globally unique `itemCode` and has no visible `organizationId` field in the inspected schema. Confirm whether this model is intentionally global or needs a tenant-aware migration. Do not assume it is safe to change without inspecting controllers, services, data, and live indexes.

**Status:** static readiness audit only; no database or production verification performed.
