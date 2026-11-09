# Monthly close validation test plan

Use the configured test runner and a disposable database.

1. `POST /api/monthly-financial-close` with month `2026-13` → expect 400.
2. Send negative, `NaN`, infinity, or fractional UGX amount → expect 400.
3. Add unknown checklist property → expect 400.
4. Send checklist value `"true"` as a string → expect 400.
5. Send extra body field with global ValidationPipe enabled → expect 400.
6. Save draft with incomplete checklist; attempt review/close → expect 400.
7. Complete checklist but leave critical escalations or unresolved reconciliation with no exception disposition → expect 400.
8. Supply reviewer note and documented exception disposition → expect closed status and audit event.
9. Attempt ordinary save after closure → expect 409.
10. Reopen without a specific reason → expect 400; reopen with reason → expect reopened status and audit event.
11. Attempt all routes anonymously and as a non-owner → expect rejection.
12. Repeat close/reopen requests and verify state transitions and audit records are consistent.