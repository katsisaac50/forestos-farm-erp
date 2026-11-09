# ForestOS Phase 154 — MongoDB Transactional Persistence Adapter

## Delivered
- Mongoose-compatible adapter for tenant-scoped master data.
- Unique index plan for `(tenantId, domain, recordId)` and tenant-scoped commit IDs.
- Transaction wrapper through `connection.startSession()` / `session.withTransaction()`.
- Tenant-scoped optimistic revision check.
- Batch reconciliation via Phase 152; conflicts/quarantined records are not committed.
- Commit ledger entries with batch and master snapshot checksums.
- Dependency-injected contract tests that run without a database server.

## Run contract tests
```bash
node scripts/phase154-mongodb-transactional-persistence-adapter-contract-tests.js
```

## Production integration requirements
This phase adds the database adapter code but does not automatically wire it into the running NestJS API or prove it against a live MongoDB server. The MongoDB deployment must support transactions (normally a replica set or sharded cluster); the application must define and pass actual Mongoose models and connection. Apply indexes intentionally, verify schema compatibility, and run integration tests against a disposable replica-set database before production. The adapter currently replaces a tenant's registry records inside a transaction after reconciliation; large registries should move to differential upserts and bounded batches. Enforce authentication and authorization at the API boundary, and validate tenant ownership from trusted auth context—not a client-supplied tenant ID.
