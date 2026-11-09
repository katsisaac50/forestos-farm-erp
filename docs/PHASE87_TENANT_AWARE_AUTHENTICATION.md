# Phase 87 — Tenant-Aware Authentication and Membership Enforcement

## Added
- `OrganizationAccessService.resolveContext(userId, organizationId)` verifies that
  the organization exists, is active, and has an active membership for the user.
- `GET /api/organization-access/mine` lists active organizations available to the
  authenticated user.
- `GET /api/organization-access/context` resolves a verified context using the
  `X-Organization-Id` selector. The header is treated as an untrusted selector,
  not as proof of access.
- Both endpoints are protected by `JwtAuthGuard`.

## API usage
1. Authenticate and obtain a JWT.
2. Call `GET /api/organization-access/mine`.
3. Choose an `organizationId` returned by that endpoint.
4. Call `GET /api/organization-access/context` with `X-Organization-Id`.
5. The API rechecks active organization status and active membership server-side.

## Security limitations
- This phase exposes verified context resolution; it does not automatically attach
  that context to every request or retrofit every domain endpoint.
- Existing domain controllers still require explicit tenant scoping and authorization.
- User identity extraction supports `sub`, `userId`, or `id` on the authenticated
  request; verify the exact JWT payload shape used by the deployed auth strategy.
- Before production use, run API build and integration tests against the actual
  Mongoose schemas and confirm all routes use the expected global/route guards.
- Do not onboard independent customer organizations until all read/write paths,
  uploads/downloads, exports, background jobs, and audit queries are tenant-scoped.

## Required tests
1. No JWT -> 401 for both routes.
2. Active membership + active organization -> context returned.
3. Missing/revoked membership -> 403.
4. Unknown/inactive organization -> safe not-found response.
5. User A cannot resolve Organization B without an active membership.
6. `mine` only returns active memberships and active organizations.
7. Verify route prefix (`/api`) and JWT user payload against the actual deployment.
