# Phase 219 — Manifest/Lockfile Alignment Gate

Phase 219 hardens the existing actual API build runner before it can invoke `npm ci`. It now checks that `apps/api/package-lock.json` has a root `packages[""]` entry and that `dependencies`, `devDependencies`, and `optionalDependencies` exactly match the API manifest. A mismatch blocks installation and compilation, preventing a misleading preflight-ready result.

## Run

```bash
node scripts/phase218_actual_api_build_runner.js --root . --report PHASE219_BUILD_REPORT.json
node scripts/phase219_manifest_lockfile_alignment_contract_tests.js
```

To request actual execution after the reviewed lockfile is present:

```bash
node scripts/phase218_actual_api_build_runner.js --root . --execute --report PHASE219_BUILD_REPORT.json
```

Actual install/build success is not asserted by the local synthetic contract tests. The current source workspace still lacks `apps/api/package-lock.json`, so no clean installation or NestJS build was performed. Production remains uncleared. Existing malformed JSON `PHASE125_SCHEMA_INDEX_READINESS.json` remains an inherited issue.
