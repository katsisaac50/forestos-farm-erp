# Phase 124 — Approved Tenant Migration Dry Run

## Purpose
Build a reviewable, read-only migration plan from a data export and an explicit human-approved ownership mapping. This is not a database migration.

## Inputs
Export JSON: `salesOrders` and `inventoryItems` arrays. Approval JSON: `{ "approvals": [{"domain":"sales|inventory", "recordId":"...", "organizationId":"24-hex-object-id", "approvedBy":"reviewer identifier", "evidenceRef":"auditable evidence reference"}] }`. Use one approval per record.

## Run
From `apps/api`: `npm run dryrun:phase124:tenant-migration -- /secure/path/export.json /secure/path/approved-mapping.json`. Exit code 3 indicates blockers or uncovered records; 0 indicates the supplied mapping has no detected blockers/uncovered rows, not that it is safe to apply. Contract tests: `npm run test:phase124:contract`.

## Safety boundaries
- No MongoDB connection; no writes; no index creation/drop.
- Never infers or assigns an organization to uncovered records.
- Blocks conflicting existing organization ownership, malformed IDs, duplicate approvals, missing records, and approvals without reviewer/evidence references.
- An approval entry is only as trustworthy as its reviewer and evidence; verify both independently.
- Before any future write migration: secure backup and restore test, inspect actual schema and indexes, resolve duplicate keys, rehearse against a non-production database, obtain explicit approval, and verify record counts and tenant isolation.

## Verification limits
This is an export-based dry-run manifest generator. It does not validate whether organizations exist, whether evidence is authentic, whether the approver is authorized, or whether live database/index state matches the export. It is not production-ready.
