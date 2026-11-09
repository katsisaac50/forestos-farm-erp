# Phase 199 — Build Evidence & Release Gate

Phase 199 introduces a read-only build-evidence preflight and an explicit `--build` mode. The gate fingerprints `apps/api/package.json` and an available lockfile, verifies lockfile root identity/version and root dependency maps, checks for installed dependencies and the local Nest CLI, and writes `PHASE199_BUILD_EVIDENCE_REPORT.json`.

Run from the project root:
- `node scripts/phase199-build-evidence-gate.js` — read-only preflight.
- `node scripts/phase199-build-evidence-gate.js --build` — attempts `npm run build` only when prerequisites are present; bounded to 60 seconds by default and at most 120 seconds (`FORESTOS_PHASE199_TIMEOUT_MS`).
- `node scripts/phase199-build-evidence-gate-contract-tests.js` — contract tests.

The gate does not generate a lockfile or install dependencies. Current package evidence indicates the API lockfile and installed dependencies are absent, so the preflight should remain blocked and no actual compilation should be claimed. Even a successful compile does not itself clear production; live integration, security, configuration, and deployment checks remain necessary.
