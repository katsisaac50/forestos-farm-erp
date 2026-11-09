# Financial Investigation Cases — Test Plan
1. Unauthenticated and non-owner access rejected.
2. Duplicate case code rejected by unique index.
3. Invalid status/severity filters rejected.
4. Create records case and creation event.
5. Stale expectedVersion rejected.
6. High/critical case cannot close without independent review.
7. Creator cannot perform second review.
8. Missing second-review or reopen reason rejected.
9. Reopening resolved/closed case records event and resets review fields.
10. Evidence reference and notes appear in event history.
11. Inject failure between case save and event insert and verify recovery or clearly surfaced inconsistency.
12. UI handles empty lists, API errors, loading and narrow viewports.
13. No endpoint modifies source spending or initiates payment.
Tests are planned and have not been executed by packaging.
