# Phase 209 — CI Lockfile Artifact Verification

## Goal
Provide a local, offline, read-only verifier for the artifact produced by the Phase 208 GitHub Actions lockfile recovery workflow. This closes the handoff gap between “CI artifact uploaded” and “artifact reviewed for acceptance.”

## Usage
Download and extract the artifact from the reviewed GitHub Actions run. Verify the expected full commit hash and manifest SHA-256 through an independent trusted source, then run from the ForestOS project root:

```bash
node scripts/phase209_ci_artifact_verifier.js \
  --artifact-dir /path/to/extracted-artifact \
  --expected-commit FULL_COMMIT_HASH \
  --expected-manifest-sha256 EXPECTED_64_CHARACTER_SHA256
```

Optional report location:

```bash
--report /path/to/verification-report.json
```

The default report is `PHASE209_CI_ARTIFACT_VERIFICATION_REPORT.json`.

## Checks
- Required manifest, lockfile, and Phase 208 provenance sidecar are present.
- The provenance commit matches the independently supplied expected commit.
- Artifact manifest hash matches the independently supplied expected hash and the current project's API manifest.
- Sidecar manifest and lockfile hashes match the artifact bytes.
- Lockfile version is 2 or 3, package identity/version align, and root dependency maps match.
- The recorded registry uses HTTPS and CI marked the lockfile validated.

## Limitations
This is an offline integrity and consistency verifier, not a digital signature verifier. The sidecar is unsigned. A human must independently verify the repository, selected commit, workflow run, and registry trust. The utility never imports the lockfile, accesses the network, installs dependencies, builds the API, or clears production. A successful result is `VERIFIED_ARTIFACT_REQUIRES_HUMAN_SOURCE_REVIEW`, not production approval.

The actual Phase 208 GitHub Actions workflow has not been run from this workspace; no real CI artifact or lockfile is included in this phase. The API lockfile remains missing unless a maintainer completes that handoff.
