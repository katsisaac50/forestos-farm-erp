# Phase 220 — Authoritative Build Evidence Gate

This phase adds a fail-closed verifier for evidence exported from the authoritative CI run. It checks the full expected commit SHA, matching evidence commit, dependency installation outcome, API build outcome, and overall job/workflow conclusion. It never clears production automatically.

## Usage

After a real GitHub Actions run, prepare a JSON evidence file containing `commitSha` (or `commit`), `installOutcome`, `buildOutcome`, and `jobConclusion` (or `workflowConclusion`) from that run. Then run:

```bash
node scripts/phase220_authoritative_build_gate.js --evidence ./build-evidence.json --expected-commit FULL_40_CHARACTER_SHA --report ./phase220-gate-report.json
```

Exit code `0` means supplied fields passed the gate; `1` means evidence is incomplete or contradictory; `2` means arguments or JSON input are invalid. The report alone does not authenticate artifact provenance: independently confirm the workflow run and commit in GitHub Actions.

## Current limitation

No remote GitHub Actions run was performed as part of this phase. The API lockfile remains absent in the source workspace, so no clean installation or NestJS build is claimed. Production remains uncleared.
