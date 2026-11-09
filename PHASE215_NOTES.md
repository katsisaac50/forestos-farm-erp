# Phase 215 — Trusted Lockfile Recovery

This phase adds a safe local readiness report for the API lockfile recovery handoff. It never fabricates a lockfile, executes network calls, installs dependencies, or claims a successful build.

Run from the repository root:

```bash
node scripts/phase215_trusted_lockfile_recovery.js --root . --report phase215-lockfile-check.json
node scripts/phase215_trusted_lockfile_recovery_contract_tests.js
```

If the lockfile is missing, use a trusted network-enabled environment and the authoritative `apps/api/package.json` to generate it with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000`. Review the resulting lockfile and its source, commit it, then run `npm ci` and `npm run build`. If registry access fails, preserve the exact network error and resolve connectivity rather than inventing dependency versions.

Current known state carried forward: `apps/api/package-lock.json` is absent in this workspace; therefore actual clean install and NestJS compilation remain unverified. Production is not cleared.
