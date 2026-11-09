# Phase 171 — Security Remediation & Authorization Enforcement Readiness

## Purpose
This phase adds a read-only, source-based remediation checklist for critical authorization concerns. It does not make speculative changes to the authentication architecture. The current project shows tenant claim derivation in the registry controller, but a visible claim check alone cannot prove tenant isolation or role enforcement.

## Run
From repository root:
```bash
node scripts/phase171-security-remediation-contract-tests.js
node scripts/phase171-security-remediation-readiness.js
```
From `apps/api`:
```bash
npm run test:phase171:contract
npm run audit:phase171:security-readiness
```
The report is written to `PHASE171_SECURITY_REMEDIATION_READINESS.json`.

## Interpretation
- The report defaults to **NOT CLEARED FOR PRODUCTION**.
- Static source signals are review leads, not proof of effective runtime controls.
- The checklist does not connect to MongoDB, modify data, or execute HTTP requests.
- Review the actual NestJS global guard registration, role policy conventions, JWT validation, DTO validation settings, and tenant filters in every relevant service.
- Use Phase 170 with dedicated non-production tenant identities to test real HTTP behavior. Add live write-path tests before claiming full isolation.

## Release requirement
Do not close a finding solely because a string or decorator is present. Close it only with code review plus a test or other evidence appropriate to the control. Never run security probes with production credentials.
