# Phase 202 — Trusted Lockfile Acquisition Kit

## Purpose
Repeated diagnostics have established that the API lockfile is missing and npm registry DNS previously failed in the build environment. Phase 202 creates a handoff that can be used on a separate trusted machine with working registry access instead of pretending this environment can complete acquisition.

## Commands
- `node scripts/phase202_trusted_lockfile_acquisition_kit.js` — read-only workspace inspection plus manifest snapshot and acquisition instructions.
- `node scripts/phase202_trusted_lockfile_acquisition_kit.js --validate-candidate /path/to/package-lock.json` — validate candidate JSON, lockfileVersion 2/3, root package identity, and dependency maps against `apps/api/package.json`.
- `node scripts/phase202_trusted_lockfile_acquisition_kit_contract_tests.js` — run contract tests.

## Evidence and safety
The report `PHASE202_LOCKFILE_ACQUISITION_REPORT.json` records manifest SHA-256, candidate SHA-256 when supplied, structural validation, blockers, and next actions. The snapshot and instructions are under `artifacts/phase202-lockfile-acquisition/`.

Structural alignment is not provenance. Independently verify the source from trusted Git history or CI artifact metadata. The kit does not import or overwrite `apps/api/package-lock.json`, does not contact the network, does not install packages, does not run the NestJS build, and never clears production.

## Current known blocker
`apps/api/package-lock.json` is absent in this package. Clean installation and actual API compilation remain unverified. After obtaining and verifying a genuine lockfile, use the Phase 201 install/build gate.
