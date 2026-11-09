# Phase 198 — Trusted Lockfile Intake & Manifest Alignment

Phase 198 adds a conservative intake tool for a genuine `package-lock.json` supplied from a trusted Git/CI artifact. The tool validates lockfile JSON, lockfile version, root package identity/version, and exact root dependency/devDependency maps against `apps/api/package.json`, and records a SHA-256 digest.

## Commands

From `apps/api`:
- `npm run preflight:phase198:lockfile` — read-only status check.
- `node ../../scripts/phase198-trusted-lockfile-intake.js --candidate /absolute/path/package-lock.json` — inspect a candidate without importing it.
- `node ../../scripts/phase198-trusted-lockfile-intake.js --candidate /absolute/path/package-lock.json --import` — explicitly import a validated candidate, refusing to overwrite an existing target.
- `npm run test:phase198:contract` — run contract tests.

Structural alignment is not cryptographic proof of origin. Verify the candidate's source independently (for example, trusted repository history or CI artifact provenance) before import. This tool does not install dependencies or run compilation. Its report is `PHASE198_TRUSTED_LOCKFILE_INTAKE_REPORT.json`; production clearance is always false.
