# Phase 76 test plan

1. Owner role required for alert endpoint.
2. Overdue incident appears in overdue list and count.
3. Future due date within selected window appears in dueSoon.
4. Due date beyond cutoff does not appear in dueSoon.
5. Closed incidents are excluded from all lists/counts.
6. Critical/high incidents appear in criticalOpen until closed.
7. Awaiting approval incidents appear in the approval list.
8. Missing/blank assignedTo appears in unassigned.
9. daysAhead clamps to 1–30; invalid values fall back safely.
10. More than 1,000 open incidents sets scanTruncated.
11. Refresh updates generatedAt and latest data.
12. UI clearly states no email/SMS delivery is configured.
