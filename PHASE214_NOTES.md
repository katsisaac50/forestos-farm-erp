# ForestOS Phase 214 — Build Stabilisation Preflight

Adds a local, read-only static preflight for the API manifest and lockfile. It checks `scripts.build`, lockfile presence and JSON validity, lockfile version, package identity/version, and root `dependencies`, `devDependencies`, and `optionalDependencies` alignment. It writes a JSON report and exits with code 2 when blockers are found.

## Usage
From the repository root:

```bash
node scripts/phase214_build_stabilisation_preflight.js
node scripts/phase214_build_stabilisation_preflight.js --root . --report phase214-preflight.json
```

## Current result
The preflight correctly reports `BUILD_PREFLIGHT_BLOCKED` because `apps/api/package-lock.json` is missing. The API manifest exists and declares `nest build`, but without a trusted lockfile the project cannot claim a reproducible `npm ci` run. This phase does not fabricate a lockfile or contact the network.

This is deliberately not an installer and does not generate a lockfile or run a build. A passing report means only that static preflight passed; actual `npm ci` and `npm run build` must be executed in the authoritative CI workflow. Production clearance remains false.
