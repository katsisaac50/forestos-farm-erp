# Phase 194 — Dependency Recovery & Actual API Compilation Orchestrator

Phase 194 introduces a bounded, explicit orchestration gate for the real NestJS API clean install and build. Default/preflight mode is read-only. Install mode requires an existing `apps/api/package-lock.json` whose root package name/version match `apps/api/package.json`; it runs `npm ci --ignore-scripts --no-audit --no-fund`. Build mode requires the local Nest CLI and runs `npm run build`. `--all` runs install then build. Each process has a bounded timeout and emits truthful attempted/succeeded status to `PHASE194_API_BUILD_RECOVERY_REPORT.json`.

From the repository root:

- `node scripts/phase194-api-build-recovery-orchestrator.js` — read-only preflight.
- `node scripts/phase194-api-build-recovery-orchestrator.js --install` — explicit clean install (requires aligned lockfile).
- `node scripts/phase194-api-build-recovery-orchestrator.js --build` — explicit actual build (requires local Nest CLI).
- `node scripts/phase194-api-build-recovery-orchestrator.js --all` — install then build.
- `node scripts/phase194-api-build-recovery-contract-tests.js` — contract tests.

Equivalent npm scripts are registered in `apps/api/package.json`. `--root=/path/to/project` can target a fixture or alternate checkout. This tool does not generate a lockfile, connect to MongoDB, run live HTTP security tests, deploy, or clear production. Clean install/build results must be verified in the target environment.
