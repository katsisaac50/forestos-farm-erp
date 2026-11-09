# Closed-period versioning test plan

- Save a draft, update it, and assert versions 1 and 2 appear in chronological history.
- Close the period and assert a closed event captures reviewer, balances, checklist, summary and fingerprint.
- Modify a source reconciliation record after close, request the dashboard, and assert the period is flagged and a source_changed event is recorded.
- Modify a source record without changing selected fields and confirm the fingerprint behavior is understood and documented.
- Reopen with a reason and assert a reopened version and audit event.
- Request version history as anonymous/non-owner and expect rejection.
- Force a source query to its limit and verify the UI/API warns that the fingerprint is bounded.
- Test duplicate dashboard reads after a source change; only one transition to flagged should occur.