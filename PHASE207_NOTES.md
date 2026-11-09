# Phase 207 — Registry Connectivity & Build Recovery

## Purpose
Phase 207 adds an explicit, bounded npm registry probe and a truthful clean-install/API-build recovery gate. The default mode is read-only. Network probing, clean installation, and compilation each require their own explicit flag.

## Commands
Run from the project root:

- `node scripts/phase207_registry_build_recovery.js` — read-only preflight.
- `node scripts/phase207_registry_build_recovery.js --probe-registry` — bounded `npm ping` with retries disabled.
- `node scripts/phase207_registry_build_recovery.js --install` — attempt `npm ci` only if an existing lockfile is valid and aligned; lifecycle scripts are disabled for this recovery attempt.
- `node scripts/phase207_registry_build_recovery.js --build` — attempt `npm run build` only when the local NestJS CLI is available (or an installation was executed successfully in the same invocation).
- `node scripts/phase207_registry_build_recovery_contract_tests.js` — Phase 207 contract assertions.

The API package also exposes equivalent npm scripts prefixed `preflight:phase207`, `probe:phase207`, `install:phase207`, `build:phase207`, and `test:phase207`.

## Observed execution in this environment
The registry probe was actually run. It failed with `EAI_AGAIN` while resolving `registry.npmjs.org`. `apps/api/package-lock.json` is also absent. Therefore the clean install and API compilation remain blocked and were not claimed as successful. The report is `PHASE207_REGISTRY_BUILD_RECOVERY_REPORT.json`.

## Safety and limitations
- The script does not invent a lockfile.
- The clean-install attempt uses `--ignore-scripts`; if dependencies later install, review any required package lifecycle steps before a normal development build.
- A successful compile would not prove runtime correctness or production readiness.
- Production clearance remains false.
- The pre-existing `PHASE125_SCHEMA_INDEX_READINESS.json` is invalid JSON (extra data at line 96) and is left unchanged for separate repair.
