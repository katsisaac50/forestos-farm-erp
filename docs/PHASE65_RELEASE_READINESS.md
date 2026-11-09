# Phase 65 — Automated Testing, Integration & Release Readiness

## Purpose
Add a repeatable baseline gate before changes are merged or the app is considered for deployment. This phase adds CI build jobs and a lightweight source-contract smoke check. It does **not** claim that ForestOS is production-ready.

## Added
- `.github/workflows/release-readiness.yml`: separate CI jobs for the API build, web build, and source-contract smoke check on push, pull request, or manual workflow dispatch.
- `scripts/release-smoke-check.mjs`: checks required phase test plans/docs, build scripts, and source markers for the monthly-close versioning, capital-spend verification/corrections, and global DTO validation.
- This release-readiness checklist and test matrix.

## Run locally
From the project root:
```bash
node scripts/release-smoke-check.mjs
cd apps/api && npm install && npm run build
cd ../web && npm install && npm run build
```
Run each command in its own terminal, or return to the project root between app builds. The CI workflow installs each app independently because the project does not currently include a root workspace or committed lockfile.

## Required pre-release test matrix
| Area | Minimum test | Expected result |
| --- | --- | --- |
| Authentication | No token, expired/invalid token, valid owner token | Public health route only is unauthenticated; protected routes reject invalid sessions |
| Role permissions | Owner and field-worker tokens against every sensitive endpoint | Least privilege enforced endpoint-by-endpoint; do not assume a role label alone grants safe access |
| Capital commitments | Proposals around reserve and budget limits | Unsafe or over-budget decisions rejected |
| Spend verification | Concurrent verifications near proposal limit | Total verified spend never exceeds approved amount; test concurrent requests and process interruption |
| Evidence correction | Missing reason, duplicate pending correction, changed evidence reference | Invalid actions rejected and event history preserved |
| Reversal accounting | Reverse a verified spend and compare gross, reversal, and net totals | Reports exclude reversed amounts from net spend and preserve the audit trail |
| Monthly close | Save draft, close, view versions, reopen | Versions are ordered and actors/reasons are retained |
| Post-close change detection | Modify a source record after closing; request the close dashboard | Change is detected and a version/audit event is recorded |
| Reconciliation | Import or record duplicate/missing/mismatched transactions | Exceptions are visible; totals reconcile to underlying records |
| Backup/restore | Restore a backup into an isolated database | Restored records and indexes are verified before any live cutover |
| Web/mobile | Login, forms, error states, narrow viewport, offline queue and retry | No data loss or duplicate financial records; offline queue limitations are explicit |
| Security | Upload limits, secrets, CORS, access checks, rate limiting, dependency audit | No public exposure until reviewed and critical findings resolved |

## Known risks carried forward
1. **No verified end-to-end test suite yet.** Existing `*.test-plan.md` files are plans, not executed automated tests.
2. **Capital spend counter consistency:** Phase 62 updates the proposal counter and spend record in separate writes. A process interruption can leave them inconsistent; use a MongoDB transaction or a robust reconciliation/repair process before production.
3. **Reversal reporting:** Phase 63's original verified spend remains marked verified after reversal. Any financial report must calculate gross verified spend, reversals, and net spend distinctly. Do not treat the original status alone as net spend.
4. **Reversal date validation:** Validate date strings before converting them to ISO format; invalid dates can throw before graceful validation.
5. **Closed-period fingerprinting:** Phase 64 detection is triggered when the close dashboard is accessed and uses bounded source queries. It is not a database-wide immutable ledger and can miss source changes outside those bounds.
6. **Multi-write versioning:** close record changes, version history and audit events are not one atomic transaction.
7. **Security and deployment:** JWT storage, rate limiting, secrets, CORS, least-privilege authorization, upload storage, backups and restore remain subject to independent review.

## Release rule
A green source-contract check is not a green build. A green build is not proof of correct financial behaviour. Do not enter sensitive live financial records or expose the service publicly until the build pipeline passes, integration tests run against an isolated MongoDB instance, the above high-risk cases are tested, backup restoration is proven, and security review is complete.

## Verification status for this archive
The archive package and its ZIP integrity can be checked locally. The build workflow is included but has **not** been run by this packaging step; no claim is made that either app compiles or that MongoDB integration/security tests pass.
