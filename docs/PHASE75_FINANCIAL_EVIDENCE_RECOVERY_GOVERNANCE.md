# Phase 75 — Financial & Evidence Recovery Governance

## Delivered
- Recovery incident model with unique incident code, severity, status, case/evidence links, assigned owner, deadline, resolution, closure reason, independent approver, record version and embedded action history.
- Owner-protected endpoints:
  - `GET /api/case-evidence/recovery-incidents?status=`
  - `POST /api/case-evidence/recovery-incidents`
  - `PATCH /api/case-evidence/recovery-incidents/:id`
  - `POST /api/case-evidence/recovery-incidents/:id/approve`
  - `POST /api/case-evidence/recovery-incidents/:id/close`
- UI at `/evidence-recovery-governance`.
- Critical/high incidents require approval before closure. Creator and assigned owner cannot independently approve. Closure requires a reason and resolution summary.
- Optimistic record-version check on updates when expectedVersion is provided.

## Operational workflow
1. Create an incident for a missing/corrupt/orphaned evidence finding.
2. Link the investigation case and/or evidence record where applicable.
3. Assign a named accountable owner and due date.
4. Move the incident through in-progress, awaiting-recovery, and awaiting-approval states.
5. For critical/high incidents, a different owner-role user approves closure.
6. Close with documented reason and resolution summary.
7. Review embedded incident history for the sequence of changes.

## Limitations
- This is an initial workflow, not a certified case-management system. Incident record and history are stored in one document, but not in an immutable external log.
- There is no automatic link that creates an incident from each reconciliation finding; users create incidents based on reviewed findings.
- No email/SMS alerts, SLA scheduler, reminder automation, file restoration action, or deletion of orphan files is implemented.
- Role protection currently uses the existing owner role; there is no separate recovery-manager/approver permission set.
- Database writes are not covered by live integration tests in this environment. Before production use, test concurrent updates, duplicate incident codes, approval separation, status transitions, due dates and closure controls.
