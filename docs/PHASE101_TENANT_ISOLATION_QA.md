# ForestOS Phase 101 — Tenant Isolation & Security Regression QA

## Purpose
Add a repeatable, dependency-free static smoke check for several high-risk security boundaries before the project grows further. The check is intentionally narrow and does not claim a complete tenant-isolation audit.

## Run
From the project root:
```bash
node scripts/tenant-isolation-smoke-check.js
```
The script uses Node's built-in APIs and has no additional package dependency. It checks source patterns for:
- trusted organization ID override protection in `organizationFilter`;
- active organization and membership validation;
- JWT and organization-header resolution in Field Capture;
- organization-scoped evidence capture lookup and SHA-256 verification;
- conditional manifest append and count guard;
- evidence quota configuration validation;
- explicit disclosure that the readiness endpoint does not check database connectivity.

## Interpretation
A PASS means the expected source patterns are present. It does not prove that code paths behave correctly at runtime, that all controllers are protected, or that every legacy module is tenant-isolated. A FAIL requires review before release.

## Required follow-up audit
For every controller and service that reads or mutates organization-owned data:
1. Identify its data model and ownership key.
2. Verify all read, update, delete, aggregation, export, and background-job paths constrain by trusted organization context.
3. Verify membership is resolved server-side and roles are checked server-side.
4. Test cross-tenant ID guessing, nested references, bulk operations, and report/export endpoints.
5. Test unauthorized and inactive memberships.
6. Run integration tests against a disposable database.
7. Record findings, owner, remediation, and retest result.

## Release gates
- Static smoke check passes.
- API and web production builds pass.
- Automated integration tests prove cross-tenant requests fail closed.
- Sensitive routes are enumerated and reviewed, including modules predating the organization foundation.
- Quota concurrency and evidence recovery tests pass.
- A full backup/restore drill succeeds.

## Current limitations
This phase adds only a static smoke check and a test plan. It does not modify every legacy controller, does not add a runtime test framework, and does not certify production readiness. The evidence quota preflight remains vulnerable to concurrent oversubscription until an atomic usage ledger/reservation workflow is implemented.
