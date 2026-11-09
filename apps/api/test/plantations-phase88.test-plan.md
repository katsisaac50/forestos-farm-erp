# Phase 88 Plantation Tenant Isolation Test Plan

- [ ] Missing `X-Organization-Id` is rejected.
- [ ] Unknown organization selector is rejected.
- [ ] User without active membership cannot list or query plantation intelligence.
- [ ] Organization A sees only its own plantation records.
- [ ] Organization A cannot update an ID belonging to Organization B.
- [ ] Create ignores client-supplied `organizationId` and `createdBy`.
- [ ] Update ignores client-supplied tenant ownership fields.
- [ ] Same blockId can exist in two organizations; duplicate within one organization fails.
- [ ] Intelligence totals count only plantations in the verified organization.
- [ ] Legacy migration dry-run changes no records.
- [ ] Migration only updates records without organizationId and reports remaining count.
- [ ] Growth-sample join cannot leak samples when block IDs are reused across organizations.
- [ ] Global role guard and organization membership roles have the intended combined behavior.

These are test scenarios, not evidence that tests have passed.
