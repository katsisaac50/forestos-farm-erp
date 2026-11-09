#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const manifestPath = path.join(apiDir, 'package.json');
const targetPath = path.join(apiDir, 'package-lock.json');
const reportPath = path.join(root, 'PHASE198_TRUSTED_LOCKFILE_INTAKE_REPORT.json');
const args = process.argv.slice(2);
function argValue(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
function hashFile(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function same(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
function validate(candidate) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const raw = fs.readFileSync(candidate);
  if (raw.length > 25 * 1024 * 1024) throw new Error('Candidate exceeds 25 MiB safety limit');
  const lock = JSON.parse(raw.toString('utf8'));
  if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 2) throw new Error('lockfileVersion must be an integer >= 2');
  const rootPkg = lock.packages && lock.packages[''];
  if (!rootPkg) throw new Error('Lockfile is missing packages[""] root metadata');
  if (rootPkg.name !== manifest.name || rootPkg.version !== manifest.version) throw new Error('Root package name/version does not match apps/api/package.json');
  if (!same(rootPkg.dependencies, manifest.dependencies)) throw new Error('Root dependencies do not exactly match API manifest');
  if (!same(rootPkg.devDependencies, manifest.devDependencies)) throw new Error('Root devDependencies do not exactly match API manifest');
  if (!lock.packages || typeof lock.packages !== 'object') throw new Error('Lockfile packages map is missing');
  return { lockfileVersion: lock.lockfileVersion, packageName: rootPkg.name, packageVersion: rootPkg.version, packageCount: Object.keys(lock.packages).length, sha256: hashFile(candidate) };
}
function writeReport(report) { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n'); }
const report = { phase: 198, title: 'Trusted Lockfile Intake & Manifest Alignment', generatedAt: new Date().toISOString(), mode: args.includes('--import') ? 'import' : args.includes('--candidate') ? 'inspect-candidate' : 'preflight', status: 'BLOCKED_MISSING_TRUSTED_LOCKFILE', apiManifest: 'apps/api/package.json', targetLockfile: 'apps/api/package-lock.json', existingTarget: fs.existsSync(targetPath), candidate: null, checks: {}, installExecuted: false, buildExecuted: false, productionCleared: false, limitations: ['Structural validation cannot prove where a candidate came from; obtain it from trusted version control or CI and verify its provenance independently.', 'No package installation or API build is performed by this tool.'] };
try {
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
  report.environment = { node: process.version, npmVersion: npm.status === 0 ? npm.stdout.trim() : null, npmAvailable: npm.status === 0 };
  const candidateArg = argValue('--candidate');
  if (candidateArg) {
    const candidate = path.resolve(process.cwd(), candidateArg);
    report.candidate = { suppliedPath: candidateArg, exists: fs.existsSync(candidate) };
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) throw new Error('Candidate path does not identify a readable file');
    report.candidate.validation = validate(candidate);
    report.checks.candidateStructurallyAligned = true;
    if (args.includes('--import')) {
      if (fs.existsSync(targetPath)) throw new Error('Refusing to overwrite existing apps/api/package-lock.json');
      const fd = fs.openSync(targetPath, 'wx');
      try { fs.copyFileSync(candidate, targetPath); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      const imported = validate(targetPath);
      report.checks.importedFileRevalidated = true;
      report.imported = imported;
      report.status = 'IMPORTED_STRUCTURALLY_ALIGNED_PROVENANCE_STILL_REQUIRES_VERIFICATION';
    } else report.status = 'CANDIDATE_STRUCTURALLY_ALIGNED_REVIEW_PROVENANCE_BEFORE_IMPORT';
  } else if (fs.existsSync(targetPath)) {
    report.checks.targetExists = true;
    report.target = validate(targetPath);
    report.status = 'TARGET_STRUCTURALLY_ALIGNED_PROVENANCE_STILL_REQUIRES_VERIFICATION';
  } else {
    report.checks.targetExists = false;
    report.status = 'BLOCKED_NO_LOCKFILE_OR_CANDIDATE';
  }
} catch (error) { report.error = error.message; report.status = report.existingTarget ? 'BLOCKED_TARGET_OR_CANDIDATE_VALIDATION_FAILED' : 'BLOCKED_CANDIDATE_UNAVAILABLE_OR_INVALID'; }
writeReport(report);
console.log(JSON.stringify(report, null, 2));
if (report.status.startsWith('BLOCKED')) process.exitCode = 2;
