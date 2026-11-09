# Phase 127 — Inventory Control Tenant Isolation Implementation

## Changes
- Added `organizationId` fields to `StockItem` and `StockMovement` schema definitions.
- Added organization-scoped unique indexes for item codes and movement codes, plus an organization/date movement index.
- Added JWT-guarded controller routes that require `X-Organization-Id` and resolve it through `OrganizationAccessService.resolveContext`, which verifies active organization status and membership.
- Scoped dashboard totals, item listing, item updates, movement listings, movement-code lookups, movement posting, and parent-item lookups to the verified organization context.
- Create operations derive `organizationId` and `createdBy` through the existing `organizationDocument` helper, not from request-body ownership fields.

## API usage
Send `X-Organization-Id: <active organization ID>` with Inventory Control requests. The authenticated user must have an active membership for that organization. Requests without the header are rejected by the controller context helper.

## Critical rollout gate — existing database indexes and legacy rows
This phase changes source code and schema declarations only. **Do not deploy directly to a database containing legacy Inventory Control records without a reviewed migration.**
- Existing records may not contain `organizationId`; tenant-scoped queries will not return them until a verified mapping/backfill is completed.
- The old globally unique `itemCode` index may still exist in MongoDB. Adding the compound index does not automatically remove the old index. Inspect the live index inventory, check duplicates, and explicitly plan removal of the global index only after approved migration.
- Verify duplicate item/movement codes within each organization before creating unique compound indexes.
- Map each stock item to an organization from reliable records; quarantine ambiguous rows. Derive movement ownership only from a verified parent item; quarantine orphan movements.
- Back up and test restoration, perform a non-production dry run, compare before/after counts, and obtain approval before production migration.
- Existing authorization is retained as `@Roles('owner')`; broader roles should only be allowed after an explicit role-policy review.

## Validation and limitations
`phase127-inventory-control-tenant-contract-tests.js` is a static source contract test. It does not prove runtime authorization or database index creation. No MongoDB connection, migration, NestJS build, or HTTP integration test was run in this environment.
