# Phase 158 — Build Verification & Live Integration Readiness

## Purpose
Create a safe, repeatable preflight before attempting to compile the NestJS API or running the optional MongoDB integration suite. A successful static audit is not equivalent to a TypeScript build or live database test.

## Added
- `scripts/phase158-build-integration-preflight.js`: read-only environment/source preflight, human or JSON output, and optional `--check-mongodb` handshake check.
- `scripts/phase158-build-integration-preflight-contract-tests.js`: eight automated contract checks.
- API package commands `preflight:phase158:build-integration` and `test:phase158:contract`.

## Run
From the repository root:

```bash
node scripts/phase158-build-integration-preflight.js
node scripts/phase158-build-integration-preflight.js --json
node scripts/phase158-build-integration-preflight-contract-tests.js
```

For the optional live MongoDB handshake, set `FORESTOS_TEST_MONGODB_URI` to a **disposable test database** with a clearly test-only database name, then run:

```bash
node scripts/phase158-build-integration-preflight.js --check-mongodb
```

The optional check performs a connection and `hello` handshake only. It rejects ambiguous/non-test database names and reports whether the server advertises replica-set/logical-session prerequisites. It does not write to the database. The URI is not printed. Do not point test tooling at production data.

## Validation boundaries
Contract tests validate the preflight safeguards and report shape. They do not compile the NestJS application, prove API authorization policy, or verify transaction semantics against MongoDB. Those require installed dependencies, a controlled test environment, and the live Phase 156 integration suite.
