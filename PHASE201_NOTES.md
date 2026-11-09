# Phase 201 — Trusted Build Execution Gate

This phase introduces an explicit gate for reproducible API dependency installation and NestJS compilation.

## Commands
- Preflight (read-only): `node scripts/phase201_trusted_build_execution_gate.js`
- Install (requires valid, aligned `apps/api/package-lock.json`): `node scripts/phase201_trusted_build_execution_gate.js --install`
- Build (requires lockfile, installed dependencies and local Nest CLI): `node scripts/phase201_trusted_build_execution_gate.js --build`
- Contract test: `node scripts/phase201_trusted_build_execution_gate_contract_tests.js`

The install step uses `npm ci --ignore-scripts --no-audit --no-fund` with bounded network retries/timeouts. This conservative setting avoids running package lifecycle scripts during the initial recovery step; if native/runtime packages require scripts, review and execute them only through an approved process. No mode clears production status.

## Current limitation
The project does not contain `apps/api/package-lock.json` and the known environment previously encountered npm registry DNS resolution errors. The phase intentionally does not invent a lockfile or claim a successful install/build. Actual compilation remains pending until a trusted lockfile and usable dependency environment are available.
