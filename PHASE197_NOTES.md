# Phase 197 — Trusted Lockfile Provenance Gate

Phase 197 records a SHA-256 fingerprint of the API package manifest and, when present, the API lockfile. It validates lockfile JSON and root package name/version alignment, while explicitly distinguishing structural alignment from trusted provenance. It records Node/npm versions, available Git commit metadata, and CI environment presence.

Run `node scripts/phase197-trusted-lockfile-provenance-gate.js` or `npm run preflight:phase197:lockfile --prefix apps/api`. Exit code 2 means the lockfile gate is blocked. The tool is read-only with respect to dependencies: it does not install packages, access the network, or run a build. It writes `PHASE197_TRUSTED_LOCKFILE_PROVENANCE_REPORT.json`.

A matching package name/version is not proof of provenance. Retrieve the lockfile from trusted version control/CI or generate it in a registry-enabled environment, review the hash and source, then use the Phase 194 install/build gates. The current package manifest fingerprint is recorded in the generated report; the missing lockfile remains a blocker. Production is not cleared.
