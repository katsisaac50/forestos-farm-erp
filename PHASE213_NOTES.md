# ForestOS Phase 213 — Build Evidence Diagnosis

## Purpose
Provide a local, deterministic diagnostic for a downloaded GitHub Actions build-evidence JSON report. It separates a fully successful recorded CI build from partial/failed evidence and gives targeted next actions.

## Usage
After downloading and extracting the workflow artifact:

```bash
node scripts/phase213_build_evidence_diagnose.js --evidence /path/to/PHASE212_BUILD_EVIDENCE.json
```

Write a machine-readable diagnosis file:

```bash
node scripts/phase213_build_evidence_diagnose.js --evidence /path/to/PHASE212_BUILD_EVIDENCE.json --report ./build-diagnosis.json
```

Exit codes: `0` = recorded build evidence internally consistent; `1` = invalid input/usage; `2` = build not verified. A verified result still does not authorize production deployment.

## Interpretation
- Lockfile, install, and build step outcomes must each be `success`.
- `apiBuildSucceeded` must be true and the overall job conclusion must be `success`.
- Source commit must be a full 40-character SHA.
- Production clearance is always false.
- The tool diagnoses only the supplied report; it does not connect to GitHub, verify signatures, or replace inspection of the workflow logs.

## Limits
No remote GitHub Actions run was initiated from this environment. The API dependency lockfile is not available in the local workspace; `npm ci` and the NestJS build have not been run here. Production is not cleared.
