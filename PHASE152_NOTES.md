# ForestOS Phase 152 — Master Data Registry & Idempotent Import Engine

## Adds
- Canonical `domain:recordId` master keys for forestry, apiary, workforce, inspections, and future domains.
- Idempotent re-imports: identical payloads do not create new versions.
- Optimistic concurrency checks for changed records using `masterVersion`.
- Conflict reports for stale versions, missing records on update, and duplicate creates.
- Per-record quarantine so invalid input does not block valid records.
- Deterministic SHA-256 payload, batch, and master-snapshot checksums.
- Stable sorted output for repeatable comparisons.

## Run
```bash
node scripts/phase152-master-data-registry-idempotent-import.js --input=phase152-example-input.json --output=phase152-example-report.json --now=2026-10-29
node scripts/phase152-master-data-registry-idempotent-import-contract-tests.js
```
The sample intentionally includes a duplicate key and malformed date, so it is expected to exit with status 1 and report `review_required`.

## Limits
Offline JSON prototype only. No MongoDB/database persistence, authentication, authorization, transaction, cross-process concurrency lock, or server-enforced immutable audit log. Hashes are checksums, not digital signatures or proof of submitter identity. Production deployment must load and commit the registry transactionally in a trusted service.
