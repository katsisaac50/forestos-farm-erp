# Phase 83 — Notification Policy Test Plan

- [ ] API and web application compile.
- [ ] Unauthenticated and non-owner requests are denied.
- [ ] Create accepts valid policy and persists version 1.
- [ ] Duplicate policy key returns HTTP 409.
- [ ] Create/update without a 10-character reason is rejected.
- [ ] Invalid severity, channel, recipient line breaks, or out-of-range thresholds are rejected.
- [ ] Update requires expectedVersion.
- [ ] A stale expectedVersion returns HTTP 409 without overwriting current data.
- [ ] Successful create/update writes policy audit event.
- [ ] History is sorted newest-first and respects limit bounds.
- [ ] UI displays loading/error/empty states and allows create/edit.
- [ ] Policy settings are not described as active until evaluator integration is implemented.
- [ ] Tenant isolation is not assumed; before multi-tenant deployment, test cross-tenant read/write denial across every collection.
