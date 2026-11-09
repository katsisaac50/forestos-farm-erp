# Phase 193 — Lockfile Recovery Gate & Registry-Enabled Bootstrap

## Purpose
Provide an explicit, bounded way to generate a real API npm lockfile in a registry-enabled environment without inventing dependency resolutions or overwriting an existing lockfile.

## Commands
From the repository root:
- `node scripts/phase193-lockfile-recovery-gate.js` — local preflight; no network request or package installation.
- `node scripts/phase193-lockfile-recovery-gate.js --generate-lockfile` — explicitly opts into `npm install --package-lock-only --ignore-scripts`, with retries disabled and a bounded timeout.
- `node scripts/phase193-lockfile-recovery-contract-tests.js` — source-level contract checks.

From `apps/api`, equivalent npm scripts are `npm run preflight:phase193:lockfile`, `npm run recover:phase193:lockfile`, and `npm run test:phase193:contract`.

## Safety
- An existing lockfile is never overwritten.
- A generated file must parse and align to the manifest's package name and version.
- A failed/partial file must be manually inspected before retrying.
- Lockfile generation does not run `npm ci` or the NestJS build.
- `productionCleared` remains false.

## Limitations
No lockfile is fabricated. Registry-dependent generation was not run during packaging. Clean install, NestJS build, live HTTP authentication, MongoDB integration, and cross-tenant isolation remain outstanding.
