# Phase 63 — Financial Evidence Integrity & Corrections

## Implemented
- Added a separate `SpendEvidenceEvent` collection to retain evidence-reference change events.
- Added endpoint to update an evidence reference with a mandatory reason and a history event.
- If evidence on an already verified spend record changes, the record is flagged `correction_requested`; the original verified status and amount are not silently changed.
- Added a correction-request endpoint for verified records.
- Added a reversal endpoint that creates a separate traceable reversal record and marks the original as reversed, instead of overwriting the original amount.
- Reversal requires a unique reversal code, a real date, evidence reference and reason.
- Added audit events for evidence-reference changes, correction requests and reversals.

## Endpoints (owner-only under the existing controller role)
- `PATCH /api/capital-spend-verification/:id/evidence-reference`
  Body: `{ "evidenceReference": "receipt-ref", "reason": "Why this reference is being corrected" }`
- `POST /api/capital-spend-verification/:id/correction-request`
  Body: `{ "reason": "Why the verified record needs correction" }`
- `POST /api/capital-spend-verification/:id/reversal`
  Body: `{ "reversalCode": "REV-001", "spendDate": "2026-10-20", "evidenceReference": "credit-note-ref", "reason": "Why the expense is reversed" }`

## Important accounting and engineering limitations
1. The reversal workflow is a development scaffold. It reduces the denormalised verified-spend counter and creates a separate record, but these operations are not in one MongoDB transaction. If a process fails at an unlucky moment, reconciliation is required.
2. Reversal records use `rejected` status so they do not count as verified positive expenditure in existing dashboards. This is a workflow compromise, not a complete double-entry accounting model. A production ledger should use explicit debit/credit reversal entries or signed amounts and report gross expenditure, reversals and net expenditure separately.
3. The original record remains `verified` but has `correctionState='reversed'`. Reports that sum all `verified` records without excluding reversed originals will still show gross spend. The existing spend dashboard must be updated to report gross verified spend, reversals, and net spend separately before relying on totals after reversals.
4. Evidence references are text identifiers; this does not implement secure file upload, malware scanning, document hashing or proof that a document is genuine.
5. This endpoint layer still uses `any` request bodies. DTOs, global validation and integration tests must be extended to these endpoints.
6. No payment is executed and no bank account is accessed.

## Test plan
- Evidence reference update requires a reason and preserves a history event.
- Evidence reference change on a verified record flags correction state.
- Correction request rejects non-verified records and duplicate open requests.
- Reversal rejects a non-verified record, duplicate reversal, invalid date, missing evidence and short reason.
- Reversal creates a linked record and an audit event without overwriting the original amount.
- Simulated failures between counter update and document save are detected and repaired.
- All financial dashboards reconcile counter values against original verified records, reversal records and net spend.

## Verification status
Archive integrity and required-file presence only. No application build, database integration test, transaction test or security test has been run.