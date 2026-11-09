# Phase 195 — Registry & Lockfile Recovery Diagnostics

Phase 195 adds evidence-based diagnostics after repeated lockfile generation timeouts. The default command is offline and read-only. The optional `--check-registry` runs `npm ping` with retries disabled and a strict timeout. It validates the API manifest and checks whether an existing lockfile is parseable and aligned with the root package identity/version. It never fabricates or writes a lockfile and never runs installation or compilation.

Commands from project root:

- `node scripts/phase195-registry-lockfile-recovery-diagnostics.js`
- `node scripts/phase195-registry-lockfile-recovery-diagnostics.js --check-registry`
- `node scripts/phase195-registry-lockfile-recovery-contract-tests.js`

The packaging environment's Phase 193 lockfile generation attempt timed out. No aligned `apps/api/package-lock.json` was created. Therefore clean installation and actual NestJS compilation remain blocked; no production clearance is implied. Run the registry check and lockfile bootstrap in an environment with working npm registry access, review the generated lockfile, then execute the Phase 194 install/build gates.
