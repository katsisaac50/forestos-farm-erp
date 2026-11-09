# ForestOS Phase 151 — Live Operations & Data Integration Gateway

## Purpose
Adds an offline integration gateway that validates incoming records from ForestOS operational domains, quarantines malformed or duplicate records, and emits checksums and lineage metadata for controlled downstream integration.

## Run
From the repository root:
```bash
node scripts/phase151-live-operations-data-integration-gateway.js --input=phase151-example-input.json --output=phase151-gateway-report.json --now=2026-10-29
node scripts/phase151-live-operations-data-integration-gateway-contract-tests.js
```
From `apps/api`:
```bash
npm run gateway:phase151 -- --input=../../phase151-example-input.json --output=../../phase151-gateway-report.json --now=2026-10-29
npm run test:phase151:contract
```

## Input contract
- Root JSON object with `generatedAt` and `feeds`.
- Optional `receivedAt`, `batchId`.
- Supported feed keys: forestry, apiary, workforce, inspections, dataQuality, correctiveActions, decisionActions.
- Each feed is an array of records with a stable `recordId` or `id`, `recordedAt` date, optional status, priority, source, payload, and optional payloadHash.
- Payloads are JSON objects. Priority: critical, high, medium, low, info.
- A repeated record ID in one domain feed is quarantined after its first occurrence. IDs can repeat across different domains.
- The gateway isolates invalid records and continues processing other records in the batch.

## Output
Accepted records, quarantined rows with reasons, per-domain counters, warnings for unknown domains, and SHA-256 lineage checksums over canonicalized JSON. These checksums help detect accidental changes but are not signatures and do not prove who submitted a record.

## Production boundary
Despite the roadmap name, this phase is an offline gateway prototype. It does not establish a live network listener, connect to an external source, persist to a database, authenticate users, enforce roles, coordinate concurrent imports, deliver records, or create an immutable audit log. A production deployment still needs secured adapters, authorization, transaction boundaries, idempotency against a master store, observability, secret management, and operator review.
