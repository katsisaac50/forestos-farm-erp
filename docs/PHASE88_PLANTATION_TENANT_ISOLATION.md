# Phase 88 — Plantation Tenant Isolation

## Scope
Phase 88 applies organization membership verification and organization-scoped
Mongo queries to the plantation list, create, update, and intelligence routes.

## Request contract
All `/api/plantations` requests require a valid JWT and the `X-Organization-Id`
header. The selected organization is not trusted until
`OrganizationAccessService` verifies the user's active membership and the
organization's active status.

## Data model
- Plantation records now carry `organizationId` and `createdBy`.
- A compound unique index enforces unique `blockId` values within an
  organization rather than globally.
- Reads and updates include the verified organization ID in their database
  filter. Create operations stamp tenant ownership from the verified context,
  not from request payload data.
- Plantation intelligence only starts from plantations visible to the selected
  organization. Growth samples are currently joined by those visible block IDs;
  if block IDs are reused across organizations, growth data must also gain
  organizationId before multi-tenant growth records are enabled.

## Legacy migration
Run `apps/api/scripts/migrate-legacy-plantations-to-organization.js` first in
dry-run mode. Back up the database and verify that every unscoped legacy
plantation belongs to the selected active organization before setting
`CONFIRM_LEGACY_PLANTATION_MIGRATION=YES`. Do not run a single-organization
migration if legacy data belongs to multiple farms or tenants.

## Required validation before production
1. Confirm JWT user payload shape and route prefix.
2. Build API and run database integration tests.
3. Verify no membership -> 403, inactive organization -> 404, no selector -> 400.
4. Verify organization A cannot list, inspect, or update organization B's block.
5. Verify forged organizationId/createdBy in create/update payloads are ignored.
6. Verify duplicate blockId is allowed across organizations but rejected within one.
7. Scope growth samples and every other linked record before exposing shared tenants.
8. Review role guard semantics: organization membership roles and global `@Roles`
   authorization must be consistent.

## Limitation
This phase scopes the plantation module's four routes, not the entire ForestOS
platform. Other modules, linked collections, jobs, exports, and audit access need
their own tenant-aware migration and tests before onboarding independent customers.
