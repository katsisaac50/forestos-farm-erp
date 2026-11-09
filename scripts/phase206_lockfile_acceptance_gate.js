#!/usr/bin/env node
'use strict';
// Phase 206: explicit human-attested import of a previously reviewed lockfile candidate.
// Does not fetch, install, build, or overwrite. Structural checks are not independent proof of provenance.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'apps/api/package.json');
const targetPath = path.join(root, 'apps/api/package-lock.json');
const reportPath = path.join(root, 'PHASE206_LOCKFILE_ACCEPTANCE_REPORT.json');
const args = process.argv.slice(2);
function arg(k) { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
const report = { phase: 206, title: 'Lockfile Acceptance Gate', generatedAt: new Date().toISOString(), networkAccessAttempted: false, installExecuted: false, buildExecuted: false, productionCleared: false, imported: false, status: 'BLOCKED_EXPLICIT_REVIEW_REQUIRED', blockers: [], nextActions: [] };
try {
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  report.manifest = { name: manifest.name, version: manifest.version, sha256: sha256(manifestBytes) };
  const candidateInput = arg('--candidate');
  const expectedHash = arg('--sha256');
  const confirmed = args.includes('--confirm-trusted-source');
  if (!candidateInput || !expectedHash || !confirmed) {
    report.blockers.push('Requires --candidate PATH --sha256 EXPECTED_SHA256 --confirm-trusted-source after independent provenance review.');
  } else {
    const candidatePath = path.resolve(candidateInput);
    const bytes = fs.readFileSync(candidatePath);
    const actualHash = sha256(bytes);
    report.candidate = { path: candidatePath, sha256: actualHash, bytes: bytes.length };
    if (!/^[a-f0-9]{64}$/i.test(expectedHash) || actualHash.toLowerCase() !== expectedHash.toLowerCase()) report.blockers.push('Candidate SHA-256 does not match the explicitly supplied expected fingerprint.');
    const lock = JSON.parse(bytes.toString('utf8'));
    const lockRoot = lock.packages && lock.packages[''];
    const aligned = !!lockRoot && [2,3].includes(lock.lockfileVersion) && lockRoot.name === manifest.name && lockRoot.version === manifest.version && JSON.stringify(lockRoot.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(lockRoot.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {});
    report.candidate.lockfileVersion = lock.lockfileVersion || null;
    report.candidate.manifestAligned = aligned;
    if (!aligned) report.blockers.push('Candidate lockfile is not structurally aligned with apps/api/package.json.');
    if (fs.existsSync(targetPath)) report.blockers.push('Target apps/api/package-lock.json already exists; refusing to overwrite.');
    if (report.blockers.length === 0) {
      fs.writeFileSync(targetPath, bytes, { flag: 'wx' });
      report.imported = true;
      report.status = 'IMPORTED_REQUIRES_CLEAN_INSTALL_AND_BUILD';
      report.candidate.importedTo = 'apps/api/package-lock.json';
    }
  }
} catch (e) { report.blockers.push(`Acceptance check failed: ${e.message}`); }
report.nextActions.push('Independently verify the source repository/CI artifact and expected SHA-256 before using the confirmation flag.');
report.nextActions.push('After import, run npm ci from apps/api and then npm run build; record actual outcomes.');
report.nextActions.push('A successful import is not proof of dependency installation, compilation, runtime correctness, or production readiness.');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.imported) process.exitCode = 2;
