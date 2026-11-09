# Phase 75 test plan

1. Only authenticated owner-role users can list/create/update/approve/close incidents.
2. Missing incident code/title/description is rejected.
3. Duplicate incident code is rejected by unique index after index creation.
4. Invalid linked case/evidence ID is rejected.
5. Assignment and due-date changes appear in incident history and increment recordVersion.
6. Stale expectedVersion update returns conflict.
7. Critical/high incident cannot close without approval.
8. Creator cannot approve their own incident.
9. Assigned owner cannot approve closure.
10. Medium/low incident can close only with both closure reason and resolution summary.
11. Closed incident cannot be edited or closed again.
12. History contains creation, updates, approval and closure actions.
13. Verify due-date display for UTC and local timezone boundaries.
14. Test simultaneous approval/close/update operations against a real MongoDB instance.
15. Test duplicate incident codes and ensure useful user-facing errors.
