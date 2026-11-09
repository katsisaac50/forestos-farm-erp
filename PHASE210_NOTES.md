# Phase 210 — CI Verified API Build

Phase 210 adds `.github/workflows/forestos-api-verified-build.yml`, a manually dispatched GitHub Actions workflow. It requires the operator to type `BUILD`, generates a lockfile in CI only when absent, validates lockfile identity/version/root dependency maps, runs a clean `npm ci --ignore-scripts`, then runs the actual `npm run build`. Installation/build are bounded by job and step timeouts. The workflow records source commit, Node/npm versions, registry, manifest/lockfile SHA-256, and build output presence, then uploads evidence even when earlier steps fail.

## Run

1. Review the workflow in the authoritative repository and choose the exact source commit.
2. In GitHub Actions, select **ForestOS API Verified Build**, click **Run workflow**, and type `BUILD` into the confirmation field.
3. Review the full job outcome and downloaded `forestos-phase210-build-evidence-<commit>` artifact.
4. Review the generated lockfile diff before accepting it into source control through normal review.

The workflow does not commit or push changes. `npm ci --ignore-scripts` avoids package lifecycle scripts during installation; this may expose dependencies that require build scripts, which should be investigated deliberately rather than enabling scripts indiscriminately. A successful NestJS compilation does not establish runtime correctness, database connectivity, security, or production readiness. The workflow has been statically contract-tested locally but has NOT been executed in GitHub Actions from this workspace. Do not claim a real CI build succeeded until the remote run proves it.
