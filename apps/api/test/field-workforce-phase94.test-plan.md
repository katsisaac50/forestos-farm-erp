# Phase 94 test plan

1. All endpoints reject unauthenticated requests and missing organization context.
2. Users without active membership cannot read or mutate organization records.
3. Worker creation and task creation fail for non-manager/non-supervisor roles.
4. Cross-organization worker, task and linked apiary-action identifiers are rejected or not found.
5. Only the assigned worker or an authorized manager can transition a task.
6. Worker transitions follow allowed workflow; invalid transitions return 4xx.
7. Submission stores notes and bounded evidence references; review records reviewer notes and timestamp.
8. Every assignment/status change produces an organization-scoped event.
9. Task history and summary cannot leak other organizations' records.
10. Test role names against real membership records; align canonical casing.
11. Test assigned-worker identity mapping with real JWT subject/email values.
12. Verify index creation and performance with more than 10,000 tasks.
