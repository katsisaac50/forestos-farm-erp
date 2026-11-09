# Phase 61 — Financial Validation & Reconciliation Accuracy

## Implemented
- Reusable helpers for month strings, non-negative amounts, bounded text, and real `YYYY-MM-DD` calendar dates.
- DTOs for monthly-close save, review, and reopen requests.
- DTOs wired into the monthly-close controller.
- Checklist rejects unknown keys and non-boolean values.
- Monthly close requires non-negative whole UGX amounts.
- Global NestJS `ValidationPipe` with whitelist, forbidNonWhitelisted, and transform was enabled if the standard `main.ts` bootstrap pattern was present.

## Reconciliation accuracy requirements
A statement equation balancing is not sufficient to declare the ledger reconciled. The next safe schema-aware change should compare:
1. opening statement balance vs ledger opening balance;
2. statement credits vs ledger income/credits after classifying transfers and reversals;
3. statement debits vs ledger expenses/debits after classifying fees and transfers;
4. each statement line against a ledger transaction using a documented matching tolerance;
5. unmatched statement and ledger entries, duplicates, and period cut-off differences;
6. closing statement balance vs computed statement balance and computed ledger balance.

Do not silently classify transfers as income or expense. Do not mark a reconciliation `Matched` unless explicit matching criteria have passed.

## Why full existing-endpoint DTO coverage is still pending
Existing financial endpoints have different schemas and request shapes. Replacing all request bodies with generic DTOs without inspecting each schema could break legitimate workflows or falsely validate fields. This phase starts with the new close workflow and records broader rollout as a release requirement.

## Tests required before production
- DTO rejects malformed month/date, unknown fields, invalid numbers, and overlong notes.
- Checklist rejects unknown keys and string values such as `"true"`.
- A closed period cannot be edited; reopen requires a reason.
- Review cannot close a period when required checklist flags are missing.
- Outstanding exceptions require documented disposition.
- Repeated submissions are safe and audit events are written consistently.
- Ledger-vs-statement tests cover duplicate transactions, transfers, fees, reversals, date cut-off and mismatched totals.

## Verification status
ZIP archive integrity and required-file presence are checked. TypeScript compilation, API integration tests, MongoDB tests, and full application tests have not been run.