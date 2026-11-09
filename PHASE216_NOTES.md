# Phase 216 — Authoritative CI Handoff

This phase adds a read-only local handoff checker to reduce ambiguity before running the actual GitHub Actions API build. It checks API manifest/build-script presence, lockfile identity and root dependency-map alignment, and expected markers in the verified build workflow. Existing files are fingerprinted with SHA-256 in the report.

Run from the project root:

```sh
node scripts/phase216_authoritative_ci_handoff.js --root . --report PHASE216_CI_HANDOFF_REPORT.json
node scripts/phase216_authoritative_ci_handoff_contract_tests.js
```

A clean local report means only that the handoff inputs pass these structural checks. It does not prove that GitHub Actions ran, that `npm ci` worked, or that NestJS compiled. The report explicitly keeps those outcomes false. Resolve blockers, push reviewed changes to the authoritative repository, manually run **Actions → ForestOS API Verified Build** with the required `BUILD` confirmation, then inspect the actual workflow conclusion and uploaded evidence. Do not clear production based on this local checker.
