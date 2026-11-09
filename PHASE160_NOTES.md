# Phase 160 — Runtime Verification Orchestrator

## Purpose
Provide a repeatable, conservative gate for checking actual API build readiness and optional live MongoDB integration readiness. This phase does not claim production readiness merely from static contracts.

## Run
From the project root:

```bash
node scripts/phase160-runtime-verification-contract-tests.js
node scripts/phase160-runtime-verification.js
```

The runner checks the API build command, attempts a NestJS build only when dependencies and the local Nest CLI are present, and writes `PHASE160_RUNTIME_VERIFICATION.json`. Live MongoDB tests are opt-in through `FORESTOS_TEST_MONGODB_URI` and are blocked unless the URI's database name clearly identifies a disposable test database. The URI is never printed. The existing Phase 156 integration test creates and drops phase-specific collections, so only use a disposable database.

## Interpretation
- `PASS`: the check actually ran and succeeded.
- `SKIP`: prerequisites were unavailable; this is not a pass.
- `BLOCKED`: the live database safety gate did not accept the target.
- `FAIL`: a check ran and failed or a required project contract is absent.

## Current environment limitations
No claim is made that the NestJS build or live MongoDB test passed unless the generated runtime report explicitly says `PASS`. This environment may lack installed API dependencies and a test MongoDB URI.
