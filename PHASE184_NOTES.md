# Phase 184 — JWT Startup Safety Gate

Phase 184 implements a fail-closed JWT signing-secret policy and wires it into `AuthModule` before `JwtModule` registration. The policy rejects missing/blank secrets and known placeholder values in all environments; in production it additionally requires at least 32 characters and rejects repeated-character values. No fallback secret is provided.

## Run

From the project root:

- `node scripts/phase184-jwt-startup-safety-audit.js`
- `node scripts/phase184-jwt-startup-safety-contract-tests.js`

Configure `JWT_SECRET` via a deployment secret manager. Do not commit real secrets to source control or share them in logs. Production still requires a full NestJS build, controlled startup-failure tests, live HTTP authentication tests, tenant-membership authorization tests, and cross-tenant database isolation tests. This phase is not production certification.
