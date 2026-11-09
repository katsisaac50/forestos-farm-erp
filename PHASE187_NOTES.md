# Phase 187 — Dependency-Free JWT Contract Probe

Adds a Node.js built-in-crypto probe for the intended HS256 token contract: valid claims, wrong key, tampering, expiration, `nbf`, malformed tokens, unsupported algorithms, Bearer-header parsing, and role authorization. This probe is deliberately dependency-free so it can run without installing the NestJS API dependencies.

**Scope limitation:** This is not a test of NestJS `JwtService`, the actual `AuthGuard`, HTTP routes, login, or MongoDB. The probe models expected behavior and provides useful contract evidence, not application runtime certification. Do not treat it as a substitute for a real NestJS build and integration tests.

Run from project root:

- `node scripts/phase187-jwt-runtime-contract-probe.js`
- `node scripts/phase187-jwt-runtime-contract-tests.js`
- `cd apps/api && npm run build` (requires dependencies installed)

Production remains not cleared pending a successful build, live HTTP authentication and authorization tests, login/setup tests against an isolated database, and cross-tenant isolation tests.
