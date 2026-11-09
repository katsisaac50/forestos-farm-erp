# Phase 90 Hive Tenant Isolation Test Plan

- [ ] Unauthenticated requests are rejected.
- [ ] Missing organization header is rejected.
- [ ] Unknown or inactive organization is rejected.
- [ ] User without active membership cannot access hives.
- [ ] Organization A sees only its own hives.
- [ ] Organization A cannot update a hive owned by organization B.
- [ ] Create ignores payload organizationId and createdBy.
- [ ] Update ignores tenant ownership fields.
- [ ] Same hiveId across two organizations is allowed; within one organization is rejected.
- [ ] Legacy migration dry run makes no writes.
- [ ] Migration applies only after explicit confirmation.
- [ ] Inspection and harvest linked records cannot leak across organizations.

These are planned tests, not test results.
