#!/usr/bin/env node
'use strict';
// Phase 209: offline verifier for a downloaded Phase 208 CI artifact. It never imports, installs, fetches, or builds.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const projectRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function option(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
const artifactDir = option('--artifact-dir');
const expectedCommit = option('--expected-commit');
const expectedManifestHash = option('--expected-manifest-sha256');
const reportPath = path.resolve(option('--report') || path.join(projectRoot, 'PHASE209_CI_ARTIFACT_VERIFICATION_REPORT.json'));
const report = {
  phase: 209,
  title: 'CI Lockfile Artifact Verification',
  generatedAt: new Date().toISOString(),
  mode: 'offline-read-only',
  networkAccessAttempted: false,
  importExecuted: false,
  installExecuted: false,
  buildExecuted: false,
  productionCleared: false,
  status: 'BLOCKED_REQUIRED_INPUTS_MISSING',
  checks: {},
  blockers: [],
  nextActions: []
};
try {
  if (!artifactDir || !expectedCommit || !expectedManifestHash) {
    report.blockers.push('Required: --artifact-dir DIR --expected-commit FULL_COMMIT_HASH --expected-manifest-sha256 SHA256. Verify expected values independently before running.');
  } else {
    if (!/^[a-f0-9]{40,64}$/i.test(expectedCommit)) report.blockers.push('Expected commit must be a full 40- to 64-character hexadecimal commit identifier.');
    if (!/^[a-f0-9]{64}$/i.test(expectedManifestHash)) report.blockers.push('Expected manifest SHA-256 must be 64 hexadecimal characters.');
    const dir = path.resolve(artifactDir);
    const files = {
      manifest: path.join(dir, 'package.json'),
      lockfile: path.join(dir, 'package-lock.json'),
      provenance: path.join(dir, 'PHASE208_CI_LOCKFILE_PROVENANCE.json')
    };
    for (const [key, file] of Object.entries(files)) {
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) report.blockers.push(`Artifact is missing required file: ${path.basename(file)}`);
      report.checks[key + 'Present'] = fs.existsSync(file) && fs.statSync(file).isFile();
    }
    if (report.blockers.length === 0) {
      const manifestBytes = fs.readFileSync(files.manifest);
      const lockBytes = fs.readFileSync(files.lockfile);
      const manifest = JSON.parse(manifestBytes.toString('utf8'));
      const lock = JSON.parse(lockBytes.toString('utf8'));
      const provenance = JSON.parse(fs.readFileSync(files.provenance, 'utf8'));
      const manifestHash = sha256(manifestBytes);
      const lockHash = sha256(lockBytes);
      const root = lock.packages && lock.packages[''];
      const mapsAligned = !!root && JSON.stringify(root.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(root.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {});
      const identityAligned = !!root && [2, 3].includes(lock.lockfileVersion) && lock.name === manifest.name && lock.version === manifest.version && root.name === manifest.name && root.version === manifest.version;
      const registryUrl = typeof provenance.registry === 'string' ? new URL(provenance.registry) : null;
      report.evidence = {
        packageName: manifest.name,
        packageVersion: manifest.version,
        expectedCommit,
        artifactCommit: provenance.commit || null,
        manifestSha256: manifestHash,
        expectedManifestSha256: expectedManifestHash.toLowerCase(),
        lockfileSha256: lockHash,
        attestedManifestSha256: provenance.manifestSha256 || null,
        attestedLockfileSha256: provenance.lockfileSha256 || null,
        lockfileVersion: lock.lockfileVersion || null,
        registry: provenance.registry || null,
        lockfileValidatedInCi: provenance.lockfileValidated === true
      };
      report.checks.expectedCommitFormat = /^[a-f0-9]{40,64}$/i.test(expectedCommit);
      report.checks.artifactCommitMatches = typeof provenance.commit === 'string' && provenance.commit.toLowerCase() === expectedCommit.toLowerCase();
      report.checks.expectedManifestFingerprintMatches = manifestHash.toLowerCase() === expectedManifestHash.toLowerCase();
      report.checks.attestedManifestFingerprintMatches = provenance.manifestSha256 === manifestHash;
      report.checks.attestedLockfileFingerprintMatches = provenance.lockfileSha256 === lockHash;
      report.checks.packageIdentityAligned = identityAligned;
      report.checks.rootDependencyMapsAligned = mapsAligned;
      report.checks.ciMarkedLockfileValidated = provenance.lockfileValidated === true;
      report.checks.httpsRegistry = !!registryUrl && registryUrl.protocol === 'https:';
      report.checks.currentProjectManifestMatchesArtifact = false;
      const currentManifestPath = path.join(projectRoot, 'apps/api/package.json');
      if (fs.existsSync(currentManifestPath)) {
        report.checks.currentProjectManifestMatchesArtifact = sha256(fs.readFileSync(currentManifestPath)) === manifestHash;
      }
      for (const [key, ok] of Object.entries(report.checks)) {
        if (!ok) report.blockers.push(`Verification failed: ${key}`);
      }
      if (report.blockers.length === 0) report.status = 'VERIFIED_ARTIFACT_REQUIRES_HUMAN_SOURCE_REVIEW';
      else report.status = 'REJECTED_ARTIFACT';
    }
  }
} catch (error) {
  report.status = 'REJECTED_ARTIFACT';
  report.blockers.push(`Verification error: ${error.message}`);
}
report.nextActions.push('Independently verify the repository, selected commit, workflow run, and registry trust; this offline report is not a cryptographic signature.');
report.nextActions.push('Only after human review, use the existing Phase 206 acceptance gate to import the lockfile; then run npm ci and npm run build separately.');
report.nextActions.push('This verifier does not import files, access the network, install dependencies, compile the API, or clear production.');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'VERIFIED_ARTIFACT_REQUIRES_HUMAN_SOURCE_REVIEW') process.exitCode = 2;
