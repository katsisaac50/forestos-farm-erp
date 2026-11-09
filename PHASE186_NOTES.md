# Phase 186 — JWT Verification Configuration Consistency

## Change

The global `AuthGuard` previously passed `process.env.JWT_SECRET` directly to `JwtService.verifyAsync`, while `AuthModule` had already resolved and validated the startup secret through `resolveJwtSecret(process.env)` and configured `JwtModule` with that value. The guard now calls `verifyAsync(token)` and therefore uses the secret configured in the same `JwtService` provider used to sign tokens.

This removes the duplicate environment lookup and aligns verification with the validated startup configuration. No fallback secret has been introduced. Bearer-token checks, unauthorized handling, role checks, and existing signing behavior are preserved.

## Run

From the project root:

- `node scripts/phase186-jwt-verification-consistency-audit.js`
- `node scripts/phase186-jwt-verification-consistency-contract-tests.js`

From `apps/api`:

- `npm run test:phase186:contract`
- `npm run audit:phase186:jwt-consistency`

## Validation boundaries

The included audit and contract tests are static/source-level checks. A NestJS build, live HTTP token tests, MongoDB integration, and cross-tenant authorization tests have not been run in this environment. Do not treat this phase as production certification. Before release, install dependencies, build the API, and test valid, expired, malformed, and invalid tokens plus role and tenant isolation behavior in a controlled environment.
