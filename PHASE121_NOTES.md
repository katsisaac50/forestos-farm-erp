# Phase 121 — Sales and Inventory Tenant Remediation Readiness

## What this phase does
Directly inspects the current Sales and Inventory controller, service, and schema files, generates `PHASE121_SALES_INVENTORY_REMEDIATION_READINESS.json`, and records concrete remediation controls. This phase does not silently apply an incomplete tenant migration to business-critical records.

## Commands
From `apps/api`:
- `npm run audit:phase121:sales-inventory`
- `npm run test:phase121:contract`

From repository root:
- `node scripts/phase121-sales-inventory-remediation-readiness.js`
- `node scripts/phase121-sales-inventory-contract-tests.js`

## Source observations
The current Sales and Inventory services use unfiltered `find()` list queries and `findByIdAndUpdate()` updates. Their schemas do not currently declare `organizationId`. The controllers do not show recognizable authentication guard or organization-context resolution. These are direct source observations and high-priority remediation items, not a claim that an exploit was run or confirmed against a live deployment.

## Why the application code is not auto-patched here
A safe multi-tenant change needs coordinated controller guards, verified membership context, DTO sanitization, schema changes, legacy-record ownership/backfill, tenant-aware unique indexes, and integration tests. Adding only an `organizationId` filter without those steps can lock out valid legacy data or leave create/update paths unsafe. Implement the migration in a controlled sequence and test against a dedicated non-production database.

## Required remediation sequence
1. Confirm the authenticated user and organization selector conventions used by existing guarded modules.
2. Add organization context to Sales and Inventory controller/service contracts.
3. Add `organizationId` to schemas and assign it only server-side.
4. Inventory and backfill existing records; quarantine records whose owner cannot be established.
5. Replace list/update queries with organization-scoped queries and prevent ownership-field changes.
6. Replace global uniqueness assumptions with tenant-aware compound indexes after duplicate analysis.
7. Add same-tenant positive and cross-tenant negative integration tests for list/create/update and related reports/exports.
8. Run API build and dedicated non-production API/database tests; record the evidence before marking controls closed.

## Validation limits
Contract checks are dependency-free source checks. No Nest build, MongoDB migration, live HTTP test, or runtime cross-tenant test was run while packaging this phase. This report is not production security certification.
