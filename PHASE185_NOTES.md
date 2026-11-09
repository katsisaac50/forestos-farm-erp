# Phase 185 — Authentication Runtime Readiness

This phase adds a repeatable source-level readiness probe and contract tests for the existing authentication guard, login flow, owner setup gate, and JWT secret policy.

## Run

From `apps/api`:

- `npm run test:phase185:contract`
- `npm run audit:phase185:auth-runtime-readiness`

## Scope and limits

This is a static contract probe, not a live runtime test. It does not start NestJS, call HTTP endpoints, connect to MongoDB, or establish tenant isolation. Those require installed dependencies, a controlled test database, a test environment, and valid test configuration.

The review flags a configuration consistency point: `AuthModule` passes the validated result from `resolveJwtSecret(process.env)` to `JwtModule`, while `AuthGuard` explicitly passes `process.env.JWT_SECRET` to `verifyAsync`. These should be made consistent, preferably by using the same validated secret source or JwtService's configured secret. This phase reports the issue rather than changing behavior without a proper build/runtime verification.

Production readiness remains blocked until real startup, token, role, and cross-tenant HTTP tests pass.
