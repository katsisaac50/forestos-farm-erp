# Phase 165 — Concurrency & Recovery Verification

## Purpose
Adds an opt-in MongoDB integration scenario that races two distinct batches using the same expected tenant revision. The intended invariant is that exactly one batch commits, the stale competitor is rejected, only one new record is persisted, and the revision advances once.

## Static contract tests
Run `node scripts/phase165-concurrency-recovery-contract-tests.js`. These checks inspect the harness and service source; they do not execute MongoDB transactions.

## Live integration (opt-in)
Install API dependencies and build the API, then set `FORESTOS_TEST_MONGODB_URI`, `FORESTOS_TEST_DATABASE_NAME` (standalone `test` marker, exact URI database match), and `FORESTOS_TEST_ALLOW_WRITES=YES`. Run `node scripts/phase165-concurrency-recovery-integration-tests.js`. Use only a disposable MongoDB replica set. The harness creates random Phase 165 collections and drops only those collections.

## Limitations
A live run is required to establish actual concurrency behaviour. This scenario tests competing optimistic revisions; it does not inject network failures or prove every transient retry path. No production-readiness claim should be inferred from static checks alone.
