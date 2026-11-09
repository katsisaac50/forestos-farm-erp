# ForestOS Phase 153 — Transactional Persistence Adapter

## Delivered
- Local JSON master-store adapter that reads a persisted registry snapshot.
- Exclusive lock-directory writer coordination for cooperating local processes.
- Atomic temporary-file write followed by rename, with best-effort fsync.
- Optimistic store revision checks (`expectedRevision`).
- Reuses Phase 152 reconciliation; a batch with conflicts or quarantined records is not committed.
- A commit ledger with batch checksum, resulting master snapshot checksum, and revision range.
- Idempotent retry behavior for unchanged records.
- Contract tests for commit, retry, revision conflict, no-write-on-conflict, lock handling, and malformed store schema.

## Run
```bash
node scripts/phase153-transactional-persistence-adapter-contract-tests.js
node scripts/phase153-transactional-persistence-adapter.js --input=phase152-example-input.json --store=/tmp/forestos-master-store.json --now=2026-10-29
```
The Phase 152 example intentionally contains duplicate/invalid records, so the adapter will refuse to commit it. Use a clean input batch for a successful commit.

## Critical production limits
This is a local single-machine JSON persistence prototype, not a real database adapter. Locking only coordinates processes that respect this lock protocol; stale locks after crashes need operational recovery. Atomic rename and fsync behavior varies by filesystem/platform. There is no multi-host consensus, authenticated identity, access control, database transaction, backup/restore orchestration, encryption-at-rest policy, or immutable audit storage. Do not use it as a production multi-user store; next step is a proper database-backed adapter with enforced unique constraints and transactions.
