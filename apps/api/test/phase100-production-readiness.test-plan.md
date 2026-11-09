# Phase 100 — Production Readiness Test Plan

- [ ] `GET /api/health` returns 200 with `status: ok`.
- [ ] `GET /api/health/ready` returns 200 and identifies the database as `not_checked` until a DB-aware health indicator is implemented.
- [ ] Invalid/missing JWT cannot access protected routes.
- [ ] Cross-organization tests cover all sensitive endpoints, including older modules.
- [ ] Evidence endpoints enforce organization membership, role restrictions, MIME/signature validation, quota checks, and digest verification.
- [ ] MongoDB outage behavior and failed audit writes are tested.
- [ ] Uploads near quota are tested concurrently; strict per-organization quota ledger must be added before claiming hard quota enforcement.
- [ ] Private evidence volume permissions are verified in deployment.
- [ ] Backup/restore drill restores database and evidence files as one consistent recovery point.
- [ ] API and frontend production builds pass.
- [ ] Rollback and incident-response runbooks are reviewed.
