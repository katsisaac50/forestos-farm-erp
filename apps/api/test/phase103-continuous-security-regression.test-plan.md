# Phase 103 — Continuous Security Regression Test Plan

- [ ] Run `node scripts/phase103-security-regression.js` locally; it exits zero.
- [ ] Remove/rename a required source file in a disposable checkout and confirm the relevant check fails.
- [ ] Break a known source contract and confirm the tenant smoke checker fails.
- [ ] Confirm route inventory JSON route count equals the route array length.
- [ ] Open a pull request and verify the GitHub Actions source-contract job runs the Phase 103 checks.
- [ ] Verify API build job and web build job independently; do not infer their status from the static job.
- [ ] Add runtime integration tests with two organizations and separate memberships.
- [ ] Require review of all route inventory signals before a production release.
