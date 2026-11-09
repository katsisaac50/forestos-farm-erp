# Phase 85 — Multi-Organization Foundation

## Delivered
- Organization registry: slug, name, status, base currency, timezone, country, creator, and version.
- Membership records with roles owner, admin, manager, field_worker, finance, viewer.
- Audit events for organization creation and membership additions.
- Owner-only API and `/organizations` dashboard.
- Unique indexes for organization slugs and user/organization memberships.
- Required reason for organization creation and membership grant.

## API
- `GET /api/organizations`
- `POST /api/organizations`
- `POST /api/organizations/memberships`
- `GET /api/organizations/:id/memberships`
- `GET /api/organizations/:id/audit?limit=100`

## Critical security boundary
This is **not production-ready multi-tenant isolation**. Existing domain collections and endpoints have not been retrofitted with organization IDs and tenant filters. Membership records are not integrated into login to authorize tenant access. Do not onboard independent customer organizations until all reads, writes, uploads, downloads, reports, jobs, exports, and unique indexes are tenant-scoped and cross-tenant tests pass.

The organization creator does not automatically receive membership. A separate secure bootstrap/owner-grant flow is still required.

## Next scale milestones
1. Add immutable organization IDs to tenant-owned records.
2. Resolve tenant only from trusted auth context and active membership.
3. Scope every read/write and storage key.
4. Add compound indexes including organization ID.
5. Scope jobs, caches, exports, and audit trails.
6. Add cross-tenant tests, migration and rollback scripts.
7. Add per-tenant quotas, monitoring, retention, backup, and restore policies.

## Manual tests
- [ ] API and frontend builds.
- [ ] Owner authorization enforced.
- [ ] Duplicate slug and duplicate membership return conflicts.
- [ ] Invalid fields and missing reasons rejected.
- [ ] Audit records written for successful operations.
- [ ] Unknown organization IDs return 404.
- [ ] Cross-tenant isolation verified before customer onboarding.

## Verification
ZIP integrity and required Phase 85 files are checked. Application builds, database integration tests, and browser tests have not been run.
