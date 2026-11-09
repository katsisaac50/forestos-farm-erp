# Phase 190 — Dependency Lockfile & Clean Build Recovery

Phase 190 adds an explicit npm lockfile bootstrap command and a readiness audit. The API manifest declares npm-compatible dependencies, but the prior phase found no `apps/api/package-lock.json`. A lockfile must be resolved from the package registry and should not be fabricated or hand-written from version ranges.

## Commands

From `apps/api`:

```bash
npm run bootstrap:phase190:lockfile
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

The bootstrap command runs `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, applies a timeout, validates the generated lockfile structure, and refuses to silently overwrite an existing malformed lockfile. It requires registry access unless metadata is already cached. After generation, review and commit `apps/api/package-lock.json`; do not rely on regenerating it in every CI run.

From the repository root, run:

```bash
node scripts/phase190-build-lockfile-readiness.js
node scripts/phase190-build-lockfile-contract-tests.js
```

## Current environment result

Lockfile generation was attempted during packaging but timed out before a lockfile could be produced. Therefore this ZIP deliberately does **not** contain a fabricated lockfile, and a clean install/build has not been claimed. The next action is to run the bootstrap command in a registry-enabled environment, commit the resulting lockfile, then run `npm ci` and `npm run build`.

The readiness audit is non-mutating. It does not install dependencies, run the API, call HTTP endpoints, or grant production clearance. Live authentication, role authorization, database integration, and cross-tenant isolation remain unverified. ForestOS is not cleared for production.
