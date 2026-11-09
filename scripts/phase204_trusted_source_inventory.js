#!/usr/bin/env node
'use strict';
// Phase 204: read-only inventory of plausible trusted lockfile sources. No network, writes, installs, or imports.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps/api');
const manifestPath = path.join(apiDir, 'package.json');
const reportPath = path.join(root, 'PHASE204_TRUSTED_SOURCE_INVENTORY_REPORT.json');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const report = { phase: 204, title: 'Trusted Source Inventory', generatedAt: new Date().toISOString(), readOnly: true, networkAccessAttempted: false, installExecuted: false, buildExecuted: false, productionCleared: false, status: 'BLOCKED_NO_TRUSTED_CANDIDATE', manifest: null, sources: [], blockers: [], nextActions: [] };
function runGit(args) { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 2500, maxBuffer: 1024 * 1024 }); return { ok: r.status === 0, status: r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), error: r.error ? r.error.message : null }; }
function validateCandidate(file, source) {
  try {
    const stat = fs.statSync(file); if (!stat.isFile() || stat.size > 25 * 1024 * 1024) return null;
    const bytes = fs.readFileSync(file); const lock = JSON.parse(bytes.toString('utf8'));
    const rootPkg = lock.packages && lock.packages[''];
    const identityMatches = !!rootPkg && rootPkg.name === manifest.name && rootPkg.version === manifest.version;
    const depsMatch = JSON.stringify(rootPkg && rootPkg.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(rootPkg && rootPkg.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {});
    return { source, path: file, bytes: stat.size, sha256: sha256(bytes), lockfileVersion: lock.lockfileVersion || null, identityMatches, rootDependenciesMatch: depsMatch, structurallyAligned: identityMatches && depsMatch && [2,3].includes(lock.lockfileVersion) };
  } catch (_) { return null; }
}
let manifest;
try {
  const bytes = fs.readFileSync(manifestPath); manifest = JSON.parse(bytes.toString('utf8'));
  if (!manifest.name || !manifest.version) throw new Error('API manifest lacks name/version.');
  report.manifest = { path: 'apps/api/package.json', name: manifest.name, version: manifest.version, sha256: sha256(bytes) };
} catch (e) {
  report.status = 'BLOCKED_INVALID_API_MANIFEST'; report.blockers.push(e.message);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2)); process.exitCode = 2;
}
if (manifest) {
  const seen = new Set();
  const add = (file, source) => { const resolved = path.resolve(file); if (seen.has(resolved)) return; seen.add(resolved); const c = validateCandidate(resolved, source); if (c) report.sources.push(c); };
  add(path.join(apiDir, 'package-lock.json'), 'api_directory');
  add(path.join(apiDir, 'npm-shrinkwrap.json'), 'api_directory');
  // Inspect only lockfile paths tracked by the current Git index; do not scan arbitrary filesystem trees.
  const tracked = runGit(['ls-files', '-z', '**/package-lock.json', '**/npm-shrinkwrap.json']);
  report.git = { repositoryAvailable: tracked.ok, trackedLockfilePathsFound: 0, historyQueryAvailable: false };
  if (tracked.ok) {
    const paths = tracked.stdout.split('\0').filter(Boolean).slice(0, 200);
    report.git.trackedLockfilePathsFound = paths.length;
    for (const rel of paths) add(path.join(root, rel), 'git_tracked_workspace_file');
    const history = runGit(['log', '--all', '--format=%H', '--', 'apps/api/package-lock.json']);
    report.git.historyQueryAvailable = history.ok && !!history.stdout;
    report.git.apiLockfileCommitCount = history.ok && history.stdout ? history.stdout.split('\n').filter(Boolean).length : 0;
    if (report.git.historyQueryAvailable) report.git.apiLockfileCommitHashes = history.stdout.split('\n').filter(Boolean).slice(0, 20);
  }
  const aligned = report.sources.filter(s => s.structurallyAligned);
  if (aligned.length) { report.status = 'CANDIDATES_FOUND_PROVENANCE_REVIEW_REQUIRED'; report.nextActions.push('Independently verify the candidate source (trusted Git remote/commit or CI artifact) before importing.'); report.nextActions.push('Run Phase 203 provenance attestation checks, then Phase 201 install/build gate in a clean working copy.'); }
  else {
    report.blockers.push('No structurally aligned lockfile was found in the API directory or tracked workspace lockfile paths.');
    report.nextActions.push('Check the authoritative repository and CI artifacts from a trusted, registry-enabled environment.');
    report.nextActions.push('Generate package-lock.json using the API manifest in that environment; capture Node/npm versions, registry, command, Git commit, and SHA-256 hashes.');
    report.nextActions.push('Transfer the candidate and provenance sidecar back, verify them with Phase 203, then run Phase 201 install/build.');
  }
  report.summary = { candidatesInspected: report.sources.length, structurallyAlignedCandidates: aligned.length, trustedProvenanceVerified: false };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
}
