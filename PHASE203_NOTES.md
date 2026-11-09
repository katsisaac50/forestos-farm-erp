# Phase 203 — Lockfile Provenance Attestation Check

Adds a read-only verifier for a candidate `package-lock.json` plus a JSON provenance sidecar. It checks candidate and manifest SHA-256 fingerprints, package identity/version, supported lockfile version, and root dependency maps. It never imports a lockfile, installs dependencies, accesses the network, or runs the API build.

Run `node scripts/phase203_lockfile_provenance_attestation.js` for an input preflight. Verify a candidate with `node scripts/phase203_lockfile_provenance_attestation.js --candidate /path/to/package-lock.json --attestation /path/to/provenance.json`. Use `PHASE203_PROVENANCE_TEMPLATE.json` as a field template, replacing every placeholder with actual values.

Important: this sidecar is not signed. A consistent report establishes internal consistency only, not trust in the source. Independently verify Git/CI provenance and the commit/artifact before installation. Current workspace has no API lockfile; no install/build was run and production remains not cleared.
