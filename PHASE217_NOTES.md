# Phase 217 — Lockfile Generation Runner

Phase 217 provides an explicit, opt-in lockfile-generation runner. It never invents dependency data: with `--generate`, it invokes npm's package-lock-only resolver inside `apps/api`, with lifecycle scripts disabled, audit disabled, and bounded registry timeouts. Without that flag it is read-only.

## Usage

From the repository root:

```bash
node scripts/phase217_lockfile_generation_runner.js --root . --report PHASE217_LOCKFILE_GENERATION_REPORT.json
node scripts/phase217_lockfile_generation_runner.js --root . --generate --report PHASE217_LOCKFILE_GENERATION_REPORT.json
node scripts/phase217_lockfile_generation_runner_contract_tests.js
```

Generation requires a trusted environment with npm and registry access. Review the generated lockfile before committing it. A `LOCKFILE_READY_NOT_BUILD_VERIFIED` result means only that structural checks passed; it does **not** prove `npm ci` or `npm run build` succeeded. Those must run in authoritative CI.

## Current known limitations

- The delivered workspace has no `apps/api/package-lock.json`; generation was not run as part of this phase because it requires registry access and changes the project.
- GitHub Actions was not run remotely.
- Actual clean installation and NestJS compilation remain unverified.
- `PHASE125_SCHEMA_INDEX_READINESS.json` is a pre-existing malformed JSON file and remains unchanged.
