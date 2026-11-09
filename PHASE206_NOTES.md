# Phase 206 — Lockfile Acceptance Gate

Phase 206 adds a controlled intake step for a lockfile candidate already obtained from a source independently reviewed by a maintainer. The tool requires the candidate path, an expected SHA-256 fingerprint, and `--confirm-trusted-source`. It checks JSON, lockfile version, root package identity/version, dependency-map alignment, and refuses to overwrite `apps/api/package-lock.json`.

## Usage

Read-only preflight (no candidate imported):

```bash
node scripts/phase206_lockfile_acceptance_gate.js
```

Only after independently verifying candidate origin and fingerprint:

```bash
node scripts/phase206_lockfile_acceptance_gate.js --candidate /absolute/path/to/package-lock.json --sha256 EXPECTED_64_HEX_SHA256 --confirm-trusted-source
```

The tool does not fetch, install, compile, or clear production. A hash proves byte consistency only; it does not prove who created the file. After a successful import, run `npm ci` and `npm run build` in `apps/api` in an environment with the necessary dependencies and registry access. Record actual outcomes separately.
