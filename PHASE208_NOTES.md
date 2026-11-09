# Phase 208 — CI Lockfile Recovery Handoff

## Goal
Provide a concrete path to generate the missing `apps/api/package-lock.json` in a trusted, network-enabled CI runner, rather than repeatedly adding local diagnostics in an environment with DNS failures.

## Workflow
`.github/workflows/forestos-api-lockfile-recovery.yml` is manually dispatched only. The operator must enter `GENERATE`. It checks out the selected commit, records commit/Node/npm/registry metadata, runs `npm install --package-lock-only --ignore-scripts` with bounded network settings, validates lockfile identity and root dependency maps, and uploads a lockfile plus provenance sidecar as an artifact. It does not commit or push the generated lockfile.

## Required maintainer steps
1. Put this project in its authoritative Git repository and review the workflow.
2. Run **ForestOS API Lockfile Recovery** on a reviewed commit, entering `GENERATE`.
3. Review the CI log and registry URL; do not trust an artifact merely because the workflow produced it.
4. Download the artifact and verify its commit, manifest SHA-256, lockfile SHA-256, and identity.
5. Bring the accepted lockfile into the project through the normal code-review process.
6. Run `npm ci` and `npm run build` in a network-enabled environment. This workflow deliberately does not install the full dependency tree or claim a successful API build.

## Evidence / limitations
The current local package has no API lockfile and registry DNS access previously failed with `EAI_AGAIN`. Phase 208 adds a CI handoff, but no CI run was launched from this workspace, no lockfile was generated here, and no NestJS compilation was performed. Provenance sidecar is evidence for review, not cryptographic signing or independent proof of trust. Production remains uncleared.
