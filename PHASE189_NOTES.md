# Phase 189 — Reproducible API Build Readiness

## Purpose
Establish a truthful preflight for moving ForestOS authentication verification from source-level contracts to an executable NestJS API.

## Added
- `scripts/phase189-build-reproducibility-audit.js`: inventories the API build command, Nest CLI dependency, TypeScript config, lockfile, installed NestJS dependency, and Phase 188 HTTP probe.
- `scripts/phase189-build-reproducibility-contract-tests.js`: contract tests for the preflight's requirements and safety claims.
- `PHASE189_BUILD_REPRODUCIBILITY_AUDIT.json`: generated preflight result.

## Known blockers at packaging time
- No API dependency lockfile was present.
- API dependencies were not installed (`apps/api/node_modules/@nestjs/core` was absent).
- The NestJS build was not run.
- No live HTTP authentication probe was run.

## Recommended execution
1. Choose npm as the package manager and generate `apps/api/package-lock.json` in a network-enabled development environment.
2. From `apps/api`, run `npm ci`.
3. Run `npm run build` and retain its output.
4. Run `npm run preflight:phase189:build` and `npm run test:phase189:contract` from the project root (or the equivalent `node scripts/...` commands).
5. Run the Phase 188 HTTP smoke probe only against a dedicated test API with explicit opt-in.

## Safety and scope
The preflight does not install dependencies or make network requests. It reports prerequisites only. It does not claim that compilation, live authentication, database integration, or cross-tenant tests have passed. ForestOS is not cleared for production by this phase.
