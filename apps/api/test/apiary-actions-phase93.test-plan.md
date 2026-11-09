# Phase 93 test plan

1. Unauthenticated requests are rejected on every `/api/apiary-actions` route.
2. Missing `X-Organization-Id`, inactive organizations and non-members are rejected.
3. A user in organization A cannot list, update, or read history for organization B's action.
4. Create requires a hive in the selected organization; cross-organization hive IDs fail.
5. A supplied source inspection must exist in the selected organization and match the hive.
6. Invalid priority/status/date and empty title fail with 4xx responses.
7. Update ignores unsupported tenant/creator fields and only changes the allowed fields.
8. Transition to Completed sets `completedAt`; transition away clears it.
9. Creation and update generate events visible only in the same organization.
10. Overdue and high/critical counts exclude Completed and Cancelled actions.
11. Pagination/limit caps and summary behavior are verified with datasets exceeding 10,000 records.
12. Validate index creation on a clean DB and assess duplicate action IDs on migrated databases.
