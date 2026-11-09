# Phase 89 — Growth Measurement Tenant Isolation

## Implemented
- Growth samples carry `organizationId` and use compound tenant/block/date and tenant/block/sampleCode indexes.
- Growth list, create and trend routes require authenticated user and a server-verified active organization membership.
- Growth creation verifies the referenced plantation belongs to the selected organization and stamps tenant ownership server-side.
- Plantation intelligence now fetches growth samples with the verified organization filter (fixes the Phase 88 linked-data exposure).
- Controlled legacy migration script defaults to dry-run, skips ambiguous block IDs shared across organizations, and reports unresolved records.

## Important operational considerations
- Growth entry also checks allowed organization membership roles. The existing global `@Roles` decorator can be stricter than membership roles; verify expected role mapping before deployment.
- Existing frontend requests must send `X-Organization-Id` after a user chooses a verified organization. Old clients without this header will receive 400.
- Legacy records missing organizationId are intentionally invisible until migrated. Back up data before running migration.
- Existing unique indexes and duplicate sample codes should be reviewed before applying the new index in a populated database.
- Other ForestOS modules and reports are not yet tenant-isolated. Do not onboard independent customers until end-to-end tenant security testing passes.

## Required tests (not executed)
1. User A cannot read Organization B samples via list or trend.
2. User A cannot create samples for a plantation owned by Organization B.
3. Two organizations with the same blockId see only their own samples and intelligence totals.
4. A missing or forged organization ID does not bypass membership verification.
5. Legacy migration does not modify ambiguous or unmatched samples.
6. Same sampleCode can be used by different organizations but not twice for the same tenant and block.
7. JWT payload and organization/global role checks match production authentication.
