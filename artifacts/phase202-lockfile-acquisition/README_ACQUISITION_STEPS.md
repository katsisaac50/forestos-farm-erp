# Phase 202 — Trusted Lockfile Acquisition

This kit was generated for forestos-api@0.1.0.

Manifest SHA-256: `a762ae27f19ca2ddb7598dfd73b36470d611431eb26f39ae22f7690b15a115a0`

## On a trusted machine with registry access

1. Verify this manifest fingerprint against the original ForestOS package.
2. Copy the exact `apps/api/package.json` into a clean working copy of the project.
3. From `apps/api`, run:

```sh
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000
```

4. Do not replace an existing lockfile. Review the generated `package-lock.json` and verify its root package identity and dependency maps against the manifest.
5. Preserve npm version, command output, generation timestamp, registry identity, and Git commit in provenance evidence.
6. Return the candidate lockfile and provenance evidence to ForestOS. Validate the candidate using:

```sh
node scripts/phase202_trusted_lockfile_acquisition_kit.js --validate-candidate /path/to/package-lock.json
```

This kit does not generate a lockfile in this environment, install packages, execute a build, or establish provenance by itself. Production remains not cleared.
