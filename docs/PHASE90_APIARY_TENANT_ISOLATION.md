# Phase 90 — Apiary and Hive Tenant Isolation

## Added
- Hive records now carry `organizationId` and `createdBy`.
- Unique hive IDs are enforced within each organization, rather than globally.
- `GET /api/hives`, `POST /api/hives`, and `PATCH /api/hives/:id` require JWT
  authentication, an `X-Organization-Id` selector, and active membership.
- List and update queries are scoped to the verified organization.
- Create ignores tenant ownership supplied by the client and stamps ownership
  from the verified context.
- A dry-run-first legacy migration script is included.

## Migration
Back up the database. Confirm that all unscoped legacy hives belong to the
selected active organization. Run the script without
`CONFIRM_LEGACY_HIVE_MIGRATION=YES` first. Only apply it after manual review.
If legacy records belong to multiple organizations, migrate them in reviewed
batches instead of assigning all to one organization.

## Validation still required
1. Confirm JWT user payload and `/api` route prefix in the deployment.
2. Run API build and integration tests against the real MongoDB schema.
3. Verify organization A cannot list or update organization B's hive.
4. Verify forged `organizationId`/`createdBy` values are ignored.
5. Verify duplicate hive IDs across organizations are permitted but duplicates
   within one organization are rejected.
6. Check any hive inspection, honey harvest, colony treatment, inventory, and
   financial records for their own tenant ownership and linked-record scoping.
7. Check global role guard semantics; membership roles must not accidentally
   conflict with existing application-wide roles.

## Limitation
This phase scopes the base hive registry endpoints only. It does not prove that
all apiary-related data, linked modules, reports, jobs, or the whole platform are
tenant-isolated. Do not onboard independent customer organizations until all
related paths are migrated and cross-tenant tests pass.
