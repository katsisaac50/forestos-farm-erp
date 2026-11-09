# Phase 218 — Actual API Build Runner

Phase 218 provides a local runner that can perform the actual API clean install and build in an environment with npm, registry access, and a reviewed lockfile.

## Commands

Read-only preflight:

```bash
node scripts/phase218_actual_api_build_runner.js --root . --report PHASE218_ACTUAL_API_BUILD_REPORT.json
```

Explicitly execute `npm ci` followed by the manifest's `npm run build`:

```bash
node scripts/phase218_actual_api_build_runner.js --root . --execute --report PHASE218_ACTUAL_API_BUILD_REPORT.json
```

The `--execute` flag is required before any install/build operation is attempted. The script records exit codes and bounded output tails, plus SHA-256 hashes of the manifest and lockfile. It never deploys and always sets `productionCleared` to false. The lockfile must be generated through a trusted npm workflow and reviewed first.

## Current environment status

The source workspace inherited from Phase 217 does not contain `apps/api/package-lock.json`. The actual installation/build was not run during packaging. A successful local contract test is not evidence of a successful NestJS build. Run the command in the authoritative repository after resolving and committing the lockfile.
