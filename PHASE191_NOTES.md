# Phase 191 — Clean Installation & Build Verification Gate

## Purpose
Introduce a fail-closed, explicit-mode gate for a clean npm installation and NestJS build. This phase does not fabricate a dependency lockfile or claim a build has passed.

## Commands
From `apps/api`:

- `npm run preflight:phase191:build` — read-only checks; does not install packages or build.
- `npm run install:phase191:clean` — runs `npm ci --no-audit --no-fund` only after a structurally valid, package-aligned `package-lock.json` exists.
- `npm run build:phase191:verified` — runs `npm run build` only after the lockfile and installed NestJS CLI checks pass.
- `npm run test:phase191:contract` — runs source-level contract checks.

Alternatively run the gate directly from the project root using `node scripts/phase191-clean-install-build-gate.js [preflight|install|build]`.

## Safety and reporting
- Default mode is `preflight`; no package install/build occurs by default.
- Install/build commands require a real lockfile with root package metadata aligned to `apps/api/package.json`.
- Commands have a bounded timeout and capture exit status/output tail in `PHASE191_CLEAN_INSTALL_BUILD_REPORT.json`.
- The gate never marks production cleared.

## Current evidence
The preflight reports 4/5 checks passed. The only blocker is the missing `apps/api/package-lock.json`. Node and npm are available; the API manifest, NestJS CLI declaration, and TypeScript config are present. No clean install or NestJS build was run because the required lockfile is absent.

## Limitations
Contract tests are source-level checks. They do not prove runtime authentication, authorization, tenant isolation, or application reliability. Generate and review a genuine lockfile in a registry-enabled environment before running `npm ci` and the build.
