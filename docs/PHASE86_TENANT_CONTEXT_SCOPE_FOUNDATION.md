# Phase 86 — Tenant Context and Scope Foundation

## Purpose
Phase 85 introduced the organization registry and membership records. Phase 86
adds reusable, fail-closed primitives that future API modules can use to bind
database operations to a trusted organization context.

## Added
- `organization-context.ts`: typed organization context, context validation,
  and organization-role helper.
- `organization-scope.ts`: safe Mongo-style filter and document builders.
- `organization-context.test-plan.md`: unit, integration, and release-gate
  scenarios for tenant isolation.

## Security behavior
- Missing context fails closed.
- A caller-provided organization ID is discarded by the scope helpers.
- Document creation stamps organizationId and createdBy from the trusted
  context, not from request payload values.

## Important limitation
This phase does **not** yet resolve organization membership from the JWT or
attach a verified organization context to requests. It also does not retrofit
all existing domain schemas/controllers/queries. The helpers are not a claim
that the application is tenant-isolated. Do not expose the platform to
independent customer organizations until request authentication, active
membership resolution, tenant scoping of every domain path, data migration,
and cross-tenant security tests are implemented and verified.

## Suggested next phase
Integrate membership resolution into authenticated requests, add explicit
organization selection, and apply tenant filters to a bounded first domain
module with tests before expanding the pattern to the rest of the application.
