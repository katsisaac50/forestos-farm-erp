# ForestOS Phase 155 — API Database Integration

## Delivered
- Adds a NestJS `RegistryPersistenceModule`, controller, service, DTO, and MongoDB schemas.
- Registers the module in `AppModule`.
- Adds `POST /api/registry-persistence/batches`.
- Uses the existing global JWT authentication guard; the tenant is read only from verified `req.user.organizationId` or `req.user.tenantId`, never from request body or a tenant header.
- Adds unique tenant/domain/record indexes and tenant-scoped commit/revision records.
- Uses Mongoose sessions and transactions, validates incoming records, blocks duplicate keys, enforces optimistic record versions, and stores batch/snapshot checksums.
- Contract tests inspect the integration boundary and key safety controls without requiring a database.

## Contract test
```bash
node scripts/phase155-api-database-integration-contract-tests.js
```

## API payload example
```json
{
  "batchId": "masulita-field-batch-001",
  "expectedRevision": 0,
  "incoming": [
    {
      "domain": "forestry",
      "recordId": "plot-west-01",
      "recordedAt": "2026-10-29",
      "payload": { "acres": 7, "species": "eucalyptus" }
    }
  ]
}
```
Tenant identity is deliberately omitted; it must be present in the verified JWT claims. The caller must have a token accepted by the application's existing AuthGuard.

## Important validation status
The API route is wired into the NestJS module tree, but this environment did not run a live MongoDB replica set. Contract tests are not a substitute for integration tests. Before production, run `npm install` and `npm run build` in `apps/api`, ensure the JWT payload contains a trusted organization/tenant claim, apply indexes, and test transaction rollback/concurrent requests against a disposable MongoDB replica set. Verify that existing authorization policy restricts which roles can submit batches. MongoDB transactions require replica-set or sharded-cluster support.
