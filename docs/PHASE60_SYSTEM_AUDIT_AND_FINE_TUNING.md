# ForestOS — Phase 60 System Audit & Fine-Tuning

**Scope:** source-level review of the Phase 59 ZIP and the Phase 60 additions. This is not a penetration test, statutory accounting review, or proof of a successful production build.

## Executive assessment

ForestOS has grown into a broad farm operations and financial-control starter with Next.js/React, NestJS, MongoDB/Mongoose, JWT-protected API routes, owner-role controls, audit events, and several overlapping finance dashboards. Its strength is the workflow coverage: operational records, evidence references, reconciliation, investigations, escalation, capital proposals, spend verification, and decision-support views.

The main risk is not a missing dashboard. It is that a large number of modules can look authoritative while relying on manually entered records, loosely typed request bodies, bounded queries, and data that may not be complete. The interface must keep distinguishing **recorded data**, **calculated indicators**, and **externally verified facts**.

Phase 60 adds a formal month-close workflow and documents priority engineering controls. It does not claim the full application has been compiled, integration-tested, penetration-tested, or deployed.

## Findings and tuning decisions

### P0 — before any public or real-money use
1. **Environment and deployment security:** do not expose the API/database publicly until production secrets, strict CORS, rate limiting, HTTPS, secure cookie/token strategy, upload limits, database network rules, and least-privilege database credentials are reviewed. Keep `.env` out of source control. Rotate any secret that may have been committed.
2. **Authentication and authorization:** verify every controller is covered by the global JWT guard and role checks; test anonymous, wrong-role, expired-token, and object-ID manipulation paths. UI hiding is not access control.
3. **Financial write validation:** replace `any` request bodies with DTOs using `class-validator`/`class-transformer`; reject negative, non-finite, fractional where not allowed, malformed dates, unsupported enum values, excessive strings, and unknown properties. Mongoose validation alone is not a complete API boundary.
4. **Atomic money controls:** capital-spend verification currently has a read-then-write shape. Concurrent submissions could both pass a remaining-commitment check. Use MongoDB transactions or atomic conditional updates, backed by a unique/idempotency key and concurrency tests.
5. **Backups and restore drills:** backup success is not enough. Test restoration into a separate environment, measure recovery point/time, and record the operator and date.

### P1 — financial correctness and auditability
1. **Ledger reconciliation:** the existing reconciliation computes ledger income/expense but the displayed closing formula is driven by statement totals. The control needs an explicit ledger-vs-statement comparison and clear treatment of opening balance, transfers, fees, cash withdrawals, and duplicate imports. Do not label a reconciliation “matched” solely because a statement balance equation balances.
2. **Source completeness:** list endpoints use limits (often 300 or 1,000). Any KPI must disclose truncation and avoid implying a full-population result. Phase 60 reports these limits as caveats.
3. **Period immutability:** closed records should be immutable except via a reasoned reopen with an audit event. Phase 60 adds this rule for the monthly close register; it does not lock all underlying ledger records, so a closed month must be re-reviewed if source records are later edited.
4. **Separation of duties:** a single owner account may prepare and review. For stronger governance, require different preparer and reviewer identities where staffing permits; provide a documented exception for a one-person operation.
5. **Evidence:** a text evidence reference is not an uploaded, readable receipt. Introduce controlled evidence storage, file-type/size checks, malware scanning, hashes, access controls, retention rules, and verification links.
6. **Capital budget reservation:** pending proposals should reserve or visibly compete for budget; otherwise several individually affordable proposals can collectively exceed a line budget. Approval, execution, and verified spend should be separate states.
7. **Date semantics:** use explicit UTC timestamps for instants and validated `YYYY-MM-DD` for business dates; do not use browser timezone to silently change the business period. Avoid regex date matching for financial ranges where indexed date fields are available.

### P2 — product and maintainability
1. **Typed API contracts:** generate/share DTO and response types between NestJS and Next.js; reduce `any`.
2. **Shared layout and navigation:** consolidate duplicated sidebar/navigation and standardise loading, error, empty, and success states.
3. **Pagination and query bounds:** add cursor/page pagination and indexed date range filters; display whether results are partial.
4. **Automated tests:** unit tests for financial calculations, DTO validation, roles, close/reopen transitions, duplicate IDs, budget exhaustion, and concurrent spending; API integration tests against a disposable MongoDB; web production build.
5. **Observability:** structured logs with request IDs, safe error messages, audit event correlation, health/readiness endpoints, and alerts for failed backups or repeated auth failures.
6. **Data governance:** document canonical sources for cash, expenses, tree counts, hive status, and costs; assign who may create, verify, correct, and approve each record.

## Phase 60 — monthly financial close workflow

API routes (owner-only):
- `GET /api/monthly-financial-close?month=YYYY-MM` — source snapshot and current close record.
- `POST /api/monthly-financial-close` — create/update a draft, blocked while closed.
- `PATCH /api/monthly-financial-close/:id/review` — close after all checklist items are true and a reviewer note is supplied. Outstanding reconciliation or critical escalation issues require a documented exception disposition.
- `PATCH /api/monthly-financial-close/:id/reopen` — reopen a closed month with a reason.

Checklist covers income/expenses, evidence, physical cash, bank/mobile money, capital spend, open issue ownership, backup confirmation, and management review. Values for cash and account balances are entered by the user. The module does not connect to financial institutions or certify accounting completeness.

## Known limitations of Phase 60
- Source snapshot is bounded: up to 300 reconciliation records and escalations, and 1,000 spend records per status. Very large periods need pagination/aggregation before production.
- Capital spend is selected using a date-prefix query because the current schema stores `spendDate` as a string. Prefer migrating to a validated indexed date representation.
- A close can proceed with unresolved items only when the reviewer documents an exception disposition; the system does not resolve those items automatically.
- Checklist entries are self-attested. Backup confirmation is not a live backup-service integration.
- This module does not lock or version every transaction in the underlying month; changes after close should trigger a re-close/review process.
- It is an internal control register, not a replacement for Uganda statutory accounts, tax advice, or an accountant's sign-off.

## Suggested release gates

1. Install dependencies from lockfiles and run API and web production builds.
2. Run API tests against a disposable MongoDB, including unauthorized access and concurrent spending scenarios.
3. Test month-close transitions: draft → ready for review → closed → reopened; verify close blocking, exception notes, and audit events.
4. Verify indexes, backups, and a full restore.
5. Perform a security review before public deployment.
6. Seed only verified farm facts. Current plantation/hive dashboard figures are historical reported values and should be reconfirmed in the field before being treated as current.