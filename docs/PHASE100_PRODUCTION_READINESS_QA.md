# ForestOS Phase 100 — Production Readiness & Automated QA Foundations

## Milestone
Phase 100 marks a major development milestone. This phase adds a minimal readiness response, clarifies environment configuration for private evidence storage, and establishes a release-quality checklist and QA matrix.

## Runtime endpoints
- `GET /api/health`: process liveness response.
- `GET /api/health/ready`: process-level readiness response. It explicitly reports `database: not_checked`; it is **not** a database connectivity test and must not be used alone as proof that the platform is production-ready.

## Configuration
`apps/api/.env.example` now documents:
- `FORESTOS_EVIDENCE_ROOT`
- `FORESTOS_EVIDENCE_ORG_QUOTA_BYTES` (default 10 GiB)

Keep evidence storage outside public/static directories. Use a durable private volume or private object storage for deployed multi-instance environments. Do not commit real secrets.

## Release gates before production
1. API and web production builds pass in a clean environment.
2. Unit and integration tests pass against a disposable test database.
3. Authentication and role enforcement are tested for all sensitive routes.
4. Cross-organization access tests cover every tenant-aware and legacy module.
5. Evidence upload/download/delete, quota concurrency, audit failures, and recovery scenarios are tested.
6. Database and evidence-store backup/restore is demonstrated end-to-end.
7. Secrets, CORS, HTTPS, rate limits, upload scanning, log redaction, and dependency advisories are reviewed.
8. A rollback procedure and operator runbook are reviewed.
9. Monitoring and alerts cover API errors, database connection, disk/quota capacity, and failed background work.
10. Product owners sign off on unresolved limitations.

## QA matrix
| Area | Minimum test | Pass criteria |
|---|---|---|
| Liveness | `GET /api/health` | HTTP 200 and `status=ok` |
| Readiness | `GET /api/health/ready` | HTTP 200 and explicit process/database check status |
| Auth | protected route without JWT | rejected |
| Organization scope | user from org A queries org B record | no record/data leakage |
| Evidence | upload valid and invalid file types | valid accepted, invalid rejected |
| Evidence integrity | modify stored bytes then download | integrity verification fails |
| Quotas | concurrent uploads near quota | no oversubscription once strict ledger is implemented |
| Recovery | restore DB + evidence backup | references and files agree |
| Frontend | production build and main workflows | no build errors; critical flows pass |

## Verification status
- Archive integrity and required files are checked during packaging.
- API build, web build, automated route tests, database integration tests, security tests, and restore drills were not run in this environment.
- The readiness endpoint is intentionally process-level only. Database health integration remains a follow-up task.
- This phase does not certify the project for production.
