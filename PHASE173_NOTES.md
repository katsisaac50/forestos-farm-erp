# Phase 173 — Critical Registry Query Remediation & Tenant-Scope Regression Checks

## Scope
This phase adds focused, repeatable source-level checks for the existing registry persistence tenant boundary. It checks tenant-scoped record reads/writes, tenant-scoped idempotency/revision lookups, transaction-session signals, and tenant identity derivation from authenticated request claims. It does not silently rewrite authorization or persistence logic.

## Run
From repository root:
```bash
node scripts/phase173-registry-tenant-scope-contract-tests.js
node scripts/phase173-registry-tenant-scope-audit.js
```
From `apps/api`:
```bash
npm run test:phase173:contract
npm run audit:phase173:registry-tenant-scope
```

## Important limitations
These are source-pattern checks, not runtime proof. They do not prove MongoDB isolation, role authorization, or absence of indirect data leaks. Run live cross-tenant read/write tests against a disposable MongoDB replica set and dedicated test tenants before deployment. Review the global auth/role guard behavior for the registry controller. Production remains NOT CLEARED until runtime evidence and the actual production build are available.
