# Phase 168 — Production Release Gate & Deployment Readiness

Phase 168 adds a read-only release-gate orchestrator and a contract suite. It checks that the API package manifest parses and declares the NestJS build command, runs critical contract suites from phases 164–167, inspects whether a disposable MongoDB target is configured, and records the evidence in `PHASE168_RELEASE_GATE_REPORT.json`.

## Run

From the repository root:

```bash
node scripts/phase168-production-release-gate-contract-tests.js
node scripts/phase168-production-release-gate.js
```

Or from `apps/api`:

```bash
npm run test:phase168:contract
npm run release:phase168:gate
```

## Decision semantics

- `PASS`: the specific check executed and passed.
- `FAIL`: a required check failed; the gate exits non-zero.
- `BLOCKED`: a configured database target did not pass the disposable-target safety check; the gate exits non-zero.
- `NOT VERIFIED`: evidence was unavailable or intentionally not executed.
- `REVIEW REQUIRED`: human review is required; this is not a passing security or configuration certification.

The release decision remains `NOT READY — evidence incomplete` when required evidence is missing. The gate intentionally does **not** run destructive live database integration tests automatically. It does not prove production security, tenant isolation, backup restoration, observability, or operational readiness. A security review of tenant derivation and role policy, a dependency-installed production build, and live integration tests against a disposable MongoDB replica set are still required.

Never configure live tests to target production data. MongoDB URIs are not written to the report or printed by the gate.
