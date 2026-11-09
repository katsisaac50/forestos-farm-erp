# Phase 101 — Tenant Isolation Regression Test Plan

- [ ] Run `node scripts/tenant-isolation-smoke-check.js`; all checks pass.
- [ ] Add integration tests with two organizations and users with distinct memberships.
- [ ] Attempt cross-organization reads by guessed record ID for every data-bearing controller.
- [ ] Attempt cross-organization update, delete, export, aggregate, and nested-reference operations.
- [ ] Confirm inactive memberships and inactive organizations are denied.
- [ ] Confirm user-supplied organizationId in body/query cannot override the trusted organization context.
- [ ] Verify every route is either explicitly public or protected by the intended authentication and authorization guards.
- [ ] Verify role checks use canonical role values and are consistent across modules.
- [ ] Test background jobs and scheduled tasks for explicit organization scope.
- [ ] Save a route inventory, test results, and remediation evidence before production.
