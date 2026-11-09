# Phase 123 — Legacy Tenant Data Migration Audit

## Purpose
Provides a dependency-free, read-only audit for a JSON export of legacy Sales and Inventory records before any tenant ownership backfill or index migration.

## Input format
Supply a JSON file with `salesOrders` and `inventoryItems` arrays. Each row may contain `_id`, `organizationId`, `orderId` (sales), and `itemId` (inventory). Organization IDs are checked for a 24-character hexadecimal ObjectId shape; this is a format check only, not proof that the organization exists or owns the record.

## Run
From `apps/api`: `npm run audit:phase123:legacy-tenant-data -- /secure/path/export.json`
Contract checks: `npm run test:phase123:contract`

## Safety boundaries
- Reads only the supplied JSON export; does not connect to MongoDB.
- Does not modify records, backfill organization ownership, drop indexes, or create indexes.
- Flags missing/malformed organization IDs, missing identifiers, and duplicate identifiers within an organization.
- A duplicate may be flagged on both the first and later records. Review the report rather than treating counts as a migration command.
- Ownership must be established from reliable business provenance, not guessed from current values or assigned wholesale to one tenant.
- Export files can contain sensitive business data; store them securely and do not commit them to source control.

## Verification limits
The audit checks export shape and selected data-quality risks only. It does not validate live database records, references, organization membership, existing MongoDB index state, or runtime authorization. Rehearse migration on a backed-up non-production copy and obtain human approval for ambiguous rows before any write migration.
