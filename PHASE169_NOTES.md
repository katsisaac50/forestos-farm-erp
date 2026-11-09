# Phase 169 — Production Security & Tenant-Isolation Audit

## Purpose
Create a repeatable, read-only static inventory of API controller security signals before deployment.

## Run
From repository root:

```bash
node scripts/phase169-security-tenant-isolation-contract-tests.js
node scripts/phase169-security-tenant-isolation-audit.js
```

From `apps/api`, use `npm run test:phase169:contract` and `npm run audit:phase169:security`.

## What it does
- Inventories decorated HTTP routes in controller source files.
- Flags visible guard, role-policy, and tenant-context signals for human review.
- Checks that the registry persistence controller derives tenant context from `req.user` and rejects missing tenant claims.
- Produces `PHASE169_SECURITY_TENANT_ISOLATION_AUDIT.json` with summary counts and required manual checks.
- Does not mutate application data or connect to a database.

## Important limitations
This is a heuristic static source audit. Global guards may protect routes that do not show local decorators, and tenant context in a controller does not prove every database query is tenant-scoped. Conversely, a missing visible signal does not by itself prove a vulnerability. The registry persistence controller has no explicit `@Roles(...)` decorator visible in its source; confirm the global guard and intended role policy, then add route-level policy if appropriate. No live authorization, cross-tenant, penetration, or production build test was run by this phase.

## Required release evidence
1. Run API build and full regression tests in a dependency-installed environment.
2. Test tenant A versus tenant B for every critical domain and all read/write operations.
3. Verify role matrix for owner, admin, manager, field worker, and other supported roles.
4. Inspect token validation, secret management, CORS, throttling, audit logs, and production configuration.
5. Record remediation and retest results before approving production deployment.
