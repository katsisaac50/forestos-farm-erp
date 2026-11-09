# Phase 200 — Trusted Dependency Recovery & Release Evidence Bundle

Phase 200 adds a read-only aggregator for dependency and build readiness evidence. It fingerprints the API manifest and any present lockfile, checks root package/dependency alignment, records runtime and local Nest CLI availability, and summarizes prior phase reports where present.

## Commands

- `node scripts/phase200_release_evidence_bundle.js` — read-only evidence aggregation; exits with status 2 when prerequisites are blocked.
- `node scripts/phase200_release_evidence_bundle_contract_tests.js` — contract tests.
- From `apps/api`, `npm run audit:phase200:release-evidence` or `npm run test:phase200:contract`.

Report: `PHASE200_RELEASE_EVIDENCE_BUNDLE.json`.

This phase deliberately does not access the network, import a lockfile, install packages, execute compilation, or mark production cleared. A candidate lockfile must come from a trusted Git/CI source or be generated in a registry-enabled environment, then independently verified. The pre-existing `PHASE125_SCHEMA_INDEX_READINESS.json` parse error is surfaced but not rewritten.
