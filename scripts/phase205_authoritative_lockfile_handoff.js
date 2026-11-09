#!/usr/bin/env node
'use strict';
// Phase 205: retrieve a lockfile only from an explicitly pinned commit in an explicitly expected Git remote.
// Default mode is read-only. No network fetch, install, or build is performed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const apiManifestPath = path.join(root, 'apps/api/package.json');
const outDir = path.join(root, 'artifacts/phase205-authoritative-lockfile-handoff');
const reportPath = path.join(root, 'PHASE205_AUTHORITATIVE_LOCKFILE_HANDOFF_REPORT.json');
const args = process.argv.slice(2);
function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function git(repo, gitArgs) { return spawnSync('git', ['-C', repo, ...gitArgs], { encoding: 'utf8', timeout: 5000, maxBuffer: 30 * 1024 * 1024 }); }
const report = { phase: 205, title: 'Authoritative Lockfile Handoff', generatedAt: new Date().toISOString(), networkAccessAttempted: false, installExecuted: false, buildExecuted: false, productionCleared: false, status: 'BLOCKED_TRUSTED_SOURCE_NOT_CONFIGURED', source: null, candidate: null, blockers: [], nextActions: [] };
let manifestBytes, manifest;
try { manifestBytes = fs.readFileSync(apiManifestPath); manifest = JSON.parse(manifestBytes.toString('utf8')); if (!manifest.name || !manifest.version) throw new Error('API manifest lacks package name/version'); report.apiManifest = { path: 'apps/api/package.json', name: manifest.name, version: manifest.version, sha256: sha256(manifestBytes) }; }
catch (e) { report.status = 'BLOCKED_INVALID_API_MANIFEST'; report.blockers.push(e.message); }
const repoInput = arg('--repo'); const expectedRemote = arg('--expected-remote'); const commit = arg('--commit');
if (manifest && repoInput && expectedRemote && commit) {
  const repo = path.resolve(repoInput);
  const top = git(repo, ['rev-parse', '--show-toplevel']);
  const remote = git(repo, ['remote', 'get-url', 'origin']);
  const resolved = git(repo, ['rev-parse', '--verify', `${commit}^{commit}`]);
  if (top.status !== 0) report.blockers.push('--repo is not an accessible Git working tree.');
  else if (remote.status !== 0 || remote.stdout.trim() !== expectedRemote) report.blockers.push('Configured origin does not exactly match --expected-remote.');
  else if (resolved.status !== 0 || !/^[0-9a-f]{40,64}$/i.test(resolved.stdout.trim())) report.blockers.push('--commit does not resolve to a full Git commit hash.');
  else {
    const pinned = resolved.stdout.trim();
    const remoteManifest = git(repo, ['show', `${pinned}:apps/api/package.json`]);
    const remoteLock = git(repo, ['show', `${pinned}:apps/api/package-lock.json`]);
    report.source = { repositoryRoot: top.stdout.trim(), expectedRemote, configuredOrigin: remote.stdout.trim(), requestedCommit: commit, resolvedCommit: pinned };
    if (remoteManifest.status !== 0 || remoteLock.status !== 0) report.blockers.push('Pinned commit must contain both apps/api/package.json and apps/api/package-lock.json.');
    else {
      try {
        const sourceManifest = JSON.parse(remoteManifest.stdout);
        const lock = JSON.parse(remoteLock.stdout);
        const lockRoot = lock.packages && lock.packages[''];
        const manifestMatch = sourceManifest.name === manifest.name && sourceManifest.version === manifest.version && JSON.stringify(sourceManifest.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(sourceManifest.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {});
        const lockAligned = !!lockRoot && lockRoot.name === sourceManifest.name && lockRoot.version === sourceManifest.version && JSON.stringify(lockRoot.dependencies || {}) === JSON.stringify(sourceManifest.dependencies || {}) && JSON.stringify(lockRoot.devDependencies || {}) === JSON.stringify(sourceManifest.devDependencies || {}) && [2,3].includes(lock.lockfileVersion);
        report.candidate = { lockfileVersion: lock.lockfileVersion || null, bytes: Buffer.byteLength(remoteLock.stdout), sha256: sha256(Buffer.from(remoteLock.stdout)), sourceManifestSha256: sha256(Buffer.from(remoteManifest.stdout)), currentManifestMatchesPinnedSource: manifestMatch, lockfileAlignedToPinnedManifest: lockAligned, importWritten: false };
        if (!manifestMatch) report.blockers.push('Pinned repository manifest does not match the current API manifest; review code/manifest version before using this lockfile.');
        if (!lockAligned) report.blockers.push('Lockfile does not structurally align with the pinned source manifest.');
        if (manifestMatch && lockAligned) {
          fs.mkdirSync(outDir, { recursive: true });
          const candidatePath = path.join(outDir, 'package-lock.candidate.json');
          const provenancePath = path.join(outDir, 'PROVENANCE.json');
          if (fs.existsSync(candidatePath) || fs.existsSync(provenancePath)) report.blockers.push('Output candidate or provenance already exists; refusing to overwrite.');
          else {
            fs.writeFileSync(candidatePath, remoteLock.stdout.endsWith('\n') ? remoteLock.stdout : remoteLock.stdout + '\n', { flag: 'wx' });
            fs.writeFileSync(provenancePath, JSON.stringify({ phase: 205, source: report.source, sourceManifestSha256: report.candidate.sourceManifestSha256, candidateLockfileSha256: report.candidate.sha256, packageName: sourceManifest.name, packageVersion: sourceManifest.version, lockfileVersion: lock.lockfileVersion, provenanceMethod: 'git show from pinned commit after exact origin comparison', independentlyAuthenticatedRemote: false }, null, 2) + '\n', { flag: 'wx' });
            report.candidate.importWritten = true; report.candidate.path = path.relative(root, candidatePath); report.candidate.provenancePath = path.relative(root, provenancePath); report.status = 'CANDIDATE_EXPORTED_PROVENANCE_REVIEW_REQUIRED';
          }
        }
      } catch (e) { report.blockers.push(`Pinned manifest/lockfile parsing failed: ${e.message}`); }
    }
  }
} else if (manifest) {
  report.blockers.push('Trusted-source retrieval requires all three arguments: --repo PATH --expected-remote URL --commit FULL_COMMIT_HASH.');
}
if (report.status !== 'CANDIDATE_EXPORTED_PROVENANCE_REVIEW_REQUIRED' && report.status !== 'BLOCKED_INVALID_API_MANIFEST') report.status = report.blockers.length ? 'BLOCKED_OR_REVIEW_REQUIRED' : 'BLOCKED_TRUSTED_SOURCE_NOT_CONFIGURED';
report.nextActions.push('Use only an authoritative repository URL and a full commit hash obtained independently from a trusted maintainer or CI record.');
report.nextActions.push('Review PROVENANCE.json; exact origin string matching does not independently authenticate the remote or commit.');
report.nextActions.push('After independent review, validate candidate with Phase 202/203 and use Phase 201 for clean install/build.');
report.nextActions.push('This tool never fetches from the network, installs packages, runs compilation, or clears production.');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'CANDIDATE_EXPORTED_PROVENANCE_REVIEW_REQUIRED') process.exitCode = 2;
