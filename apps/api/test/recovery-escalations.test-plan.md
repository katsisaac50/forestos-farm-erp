# Phase 77 test plan

1. Only owner-role users can evaluate or list events.
2. Critical overdue incident produces critical_overdue event.
3. Noncritical overdue incident produces overdue event.
4. Due-soon incidents produce due_soon event within selected window.
5. Unassigned and awaiting-approval conditions produce events when no higher-priority rule applies.
6. Repeated same-bucket evaluation creates no duplicate unique dedupeKey records.
7. A changed recipient creates a separate event.
8. Due-date/overdue bucket changes permit a new event according to dedupe policy.
9. Closed incidents are excluded.
10. Scan cap sets scanTruncated when 1,000 non-closed records are returned.
11. No endpoint claims external notification was sent.
12. Concurrent evaluations handle duplicate-key conflicts without duplicate events.
13. Test MongoDB outage and ensure error is surfaced.
14. Confirm scheduler and provider are absent unless separately configured.
