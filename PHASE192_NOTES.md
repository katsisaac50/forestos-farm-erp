# Phase 192 — Dependency Resolution Diagnostics & Lockfile Recovery

## Purpose
Diagnose the missing API lockfile blocker and distinguish manifest/configuration issues from npm registry connectivity. This phase does not invent a lockfile and does not run package installation or a build automatically.

## Commands
From the repository root:

- `node scripts/phase192-dependency-recovery-diagnostics.js` — offline-safe checks; no network call.
- `node scripts/phase192-dependency-recovery-diagnostics.js --check-registry` — explicitly opts in to a bounded `npm ping`.
- `node scripts/phase192-dependency-recovery-contract-tests.js` — source-level contract tests.

From `apps/api`, after registry access is available:

1. `npm run bootstrap:phase190:lockfile`
2. Inspect `package-lock.json` and commit it.
3. `npm ci --no-audit --no-fund`
4. `npm run build`

## Current evidence
During Phase 192 packaging, `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` did not complete within the 30-second execution window. No lockfile was created or fabricated. Registry connectivity must be retried from a network-enabled environment.

## Limitations
Contract tests only validate the diagnostic tool's contract. No clean install, NestJS build, live HTTP authentication, MongoDB integration, or cross-tenant isolation test was completed. Production remains not cleared.
