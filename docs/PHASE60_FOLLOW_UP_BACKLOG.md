# High-priority follow-up engineering backlog

1. DTO validation across financial write endpoints; set a global validation pipe with whitelist, forbidNonWhitelisted, transform.
2. Make capital commitment checks concurrency-safe and add idempotency/unique request identifiers.
3. Add transaction-to-statement matching for amounts/dates and compare ledger income/expense against statement totals explicitly.
4. Replace string-date regex filters with validated date fields and indexed range queries.
5. Make all dashboard totals disclose pagination/truncation and compute aggregates in MongoDB where safe.
6. Add API contract tests for global JWT guard, role guard, IDOR, validation errors, and audit event creation.
7. Add separate preparer/reviewer controls and explicit single-person-operation exception.
8. Build secure evidence upload lifecycle; text references alone are not proof.
9. Add immutable transaction corrections (reversal/correction records) and source versioning for closed periods.
10. Run production builds and tests in CI before publishing a release.