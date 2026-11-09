# Phase 205 — Authoritative Lockfile Handoff

Phase 205 adds a controlled handoff utility for retrieving an API lockfile from a pinned commit in an explicitly named authoritative Git repository. It requires all three inputs: `--repo PATH --expected-remote URL --commit FULL_COMMIT_HASH`. It compares the configured `origin` URL exactly, resolves the commit, reads `apps/api/package.json` and `apps/api/package-lock.json` from that commit, verifies the pinned manifest matches the current API manifest, and checks lockfile root identity/dependency maps.

When those checks pass, it exports a candidate and `PROVENANCE.json` under `artifacts/phase205-authoritative-lockfile-handoff/`, refusing to overwrite either file. The generated provenance is evidence for review, not cryptographic proof that the remote or commit is trustworthy. No network fetch, install, API build, or production clearance occurs.

Run a read-only default check:

```sh
node scripts/phase205_authoritative_lockfile_handoff.js
```

Run against a trusted local clone only after independently confirming the expected origin URL and full commit hash:

```sh
node scripts/phase205_authoritative_lockfile_handoff.js --repo /path/to/authoritative-clone --expected-remote https://example.invalid/org/forestos.git --commit FULL_COMMIT_HASH
```

Replace the example URL; do not use it literally. Then review the report and provenance sidecar, independently authenticate the source, validate the candidate with the Phase 202/203 tools, and use Phase 201's gated install/build commands in a clean working copy. The current package has no Git remote or trusted lockfile, so no candidate is exported by default.
