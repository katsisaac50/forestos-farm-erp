# Phase 211 — CI Build Workflow Hardening

Phase 211 fixes three practical weaknesses in the Phase 210 build workflow:

1. Removes `setup-node` npm caching because the project currently lacks a lockfile at setup time; cache setup could fail before the workflow reached lockfile generation.
2. Enables normal npm lifecycle scripts during `npm ci`, since `--ignore-scripts` can prevent legitimate dependency setup and produce a misleadingly incomplete build environment. Lockfile generation itself still uses `--ignore-scripts`.
3. Compares root dependency maps using sorted keys and includes `optionalDependencies`, avoiding false mismatches caused only by JSON key order while checking all root dependency categories.

The workflow remains manually dispatched and requires the exact confirmation value `BUILD`. It has read-only repository permissions, bounded job/step timeouts, no push/commit step, and uploads evidence on success or failure. The evidence explicitly says that a `dist` directory alone does not prove this run compiled successfully.

Run local contract tests with:

```bash
node scripts/phase211_ci_build_hardening_contract_tests.js
node scripts/phase210_verified_api_build_contract_tests.js
```

**Execution status:** workflow changes and local contract checks only. The remote GitHub Actions workflow has not been run here. The API lockfile remains missing in this workspace, so clean installation and actual NestJS compilation are not claimed. Production is not cleared.
