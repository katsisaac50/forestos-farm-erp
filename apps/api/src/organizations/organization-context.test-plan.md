# Phase 86 — Tenant Context and Scope Helper Test Plan

These are required security tests before enabling multi-organization production use.
The project build/test commands and test runner configuration must be confirmed
in the target environment before converting these scenarios into executable tests.

## Unit tests
1. `requireOrganizationContext(null)` throws.
2. Missing organization ID, user ID, or roles throws.
3. A complete context is returned unchanged.
4. `organizationFilter(context, { status: 'active' })` includes the trusted
   organization ID.
5. A supplied conflicting `organizationId` cannot override the trusted context.
6. `organizationDocument(context, payload)` sets organizationId and createdBy
   from context, even if payload supplies forged values.
7. Role checks accept only explicitly allowed roles.

## API integration tests
1. Unauthenticated requests cannot obtain organization context.
2. A user with active membership can select only organizations in which they
   have active membership.
3. Suspended organizations and revoked memberships are rejected.
4. Cross-organization reads, updates, deletes, uploads, downloads, reports,
   exports, background jobs, and audit queries return no data or a safe denial.
5. Client-supplied organization IDs in body, query, and headers cannot bypass
   server-side membership resolution.
6. Every domain collection has a documented migration/backfill plan before
   its API starts requiring organizationId.
7. Scheduler and queue workers carry an explicit organization ID and never
   infer it from a browser request.
8. Existing single-farm records are handled by an explicit migration or a
   deliberate legacy mode; there is no silent fallback to an arbitrary tenant.

## Release gate
Do not onboard independent customer organizations until every domain path is
scoped and the cross-tenant tests above pass.
