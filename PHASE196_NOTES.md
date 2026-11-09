# Phase 196 — Local Lockfile Recovery

Phase 196 searches existing project artifacts for a trusted `package-lock.json` or `npm-shrinkwrap.json` whose root package name/version exactly match `apps/api/package.json`. The default scan is read-only. It excludes dependency/build directories, caps the candidate count and candidate size, and records candidate SHA-256 hashes.

Run `node scripts/phase196-local-lockfile-recovery.js` for a read-only scan. Only after reviewing candidate provenance and checksums, run `node scripts/phase196-local-lockfile-recovery.js --recover` to copy an exact-match candidate into `apps/api/package-lock.json`. Recovery refuses to overwrite an existing target and does not install dependencies or run a build.

Current environment has no API lockfile and no trusted matching lockfile was found among project artifacts. Registry access previously failed with DNS `EAI_AGAIN`; no lockfile has been fabricated. Next step is to retrieve the exact lockfile from trusted version control/CI or run the existing Phase 193 bootstrap in a registry-enabled environment. After reviewing the lockfile, use the Phase 194 explicit clean-install/build gate. Production is not cleared.
