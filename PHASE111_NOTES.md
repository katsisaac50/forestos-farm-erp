# ForestOS Phase 111 — Membership Reference Consistency

## Finding addressed
Reviewing the actual schema against the access service revealed that `OrganizationMembership.userId` and `organizationId` are declared as strings, while `OrganizationAccessService` was querying these fields using `ObjectId` values. The organization listing also returned `m.roles` directly even though the canonical schema defines a singular `role` field.

## Changes
- Updated `resolveContext()` to query membership references using canonical string IDs.
- Updated `listMyOrganizations()` to query membership by string user ID, convert valid organization ID strings to `ObjectId` only when querying the organization's `_id`, and normalize either a legacy `roles` array or canonical singular `role`.
- Added `scripts/phase111-membership-reference-contract-tests.js` with eight static source checks.

## Validation
Run:
```sh
node --check scripts/phase111-membership-reference-contract-tests.js
node scripts/phase111-membership-reference-contract-tests.js
node scripts/phase104-membership-tenant-regression.js
node scripts/phase105-tenant-contract-tests.js
```

These are static contract checks. No live MongoDB or NestJS request was run in this phase. A full API build and database-backed integration test are still required to confirm the change at runtime.
