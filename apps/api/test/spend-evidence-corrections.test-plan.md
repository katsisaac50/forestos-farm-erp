# Spend evidence and correction test plan

1. Add a new evidence reference with reason; assert an evidence event preserves the old and new values.
2. Try an identical reference or missing/short reason; expect 400.
3. Change evidence on a verified record; assert `correctionState` becomes `correction_requested`.
4. Request correction on a submitted/rejected record; expect rejection.
5. Request correction twice while pending; expect conflict on the second request.
6. Reverse a verified spend with valid code/date/evidence/reason; assert a linked reversal record and audit event.
7. Attempt to reverse the same original twice; expect conflict.
8. Attempt reversal when the proposal counter is below the original amount; expect conflict and no reversal record.
9. Compare proposal counter to verified original records less reversals; investigate any mismatch.
10. Run failure-injection tests for failures after counter decrement but before record persistence.
11. Confirm reporting distinguishes gross verified spend, reversals, and net spend.