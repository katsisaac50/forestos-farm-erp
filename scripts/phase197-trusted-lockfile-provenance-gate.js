#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const manifestPath = path.join(apiDir, 'package.json');
const target = path.join(apiDir, 'package-lock.json');
const reportPath = path.join(root, 'PHASE197_TRUSTED_LOCKFILE_PROVENANCE_REPORT.json');
const hashFile = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run = (cmd, args) => { try { return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore',], timeout: 3000 }).trim(); } catch { return null; } };
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const report = {
  phase: 197,
  title: 'Trusted Lockfile Provenance Gate',
  generatedAt: new Date().toISOString(),
  manifest: { path: 'apps/api/package.json', name: manifest.name, version: manifest.version, sha256: hashFile(manifestPath) },
  environment: { node: process.version, npm: run('npm', ['--version']), gitCommit: run('git', ['rev-parse', 'HEAD']), ciProviderPresent: Boolean(process.env.CI), registryUrlConfigured: Boolean(process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY) },
  lockfile: { path: 'apps/api/package-lock.json', exists: fs.existsSync(target), sha256: null, jsonValid: false, lockfileVersion: null, rootNameMatches: false, rootVersionMatches: false, provenanceStatus: 'missing', installExecuted: false, buildExecuted: false },
  decision: 'BLOCKED_MISSING_TRUSTED_LOCKFILE',
  nextActions: ['Retrieve package-lock.json from trusted version control or CI artifact, or generate it in a registry-enabled environment.', 'Verify the manifest SHA-256 and lockfile root identity before clean installation.', 'Run Phase 194 install and build gates only after lockfile review.', 'Keep production deployment blocked until runtime, tenant-isolation, and security checks pass.'],
  productionCleared: false
};
if (report.lockfile.exists) {
  report.lockfile.sha256 = hashFile(target);
  try {
    const lock = JSON.parse(fs.readFileSync(target, 'utf8'));
    report.lockfile.jsonValid = true;
    report.lockfile.lockfileVersion = lock.lockfileVersion ?? null;
    report.lockfile.rootNameMatches = lock.name === manifest.name && lock.packages?.['']?.name === manifest.name;
    report.lockfile.rootVersionMatches = lock.version === manifest.version && lock.packages?.['']?.version === manifest.version;
    report.lockfile.provenanceStatus = report.lockfile.rootNameMatches && report.lockfile.rootVersionMatches && Number.isInteger(lock.lockfileVersion) ? 'structurally_aligned_requires_external_provenance' : 'identity_mismatch';
    report.decision = report.lockfile.provenanceStatus === 'identity_mismatch' ? 'BLOCKED_LOCKFILE_IDENTITY_MISMATCH' : 'REVIEW_REQUIRED_EXTERNAL_PROVENANCE';
  } catch { report.lockfile.provenanceStatus = 'invalid_json'; report.decision = 'BLOCKED_INVALID_LOCKFILE_JSON'; }
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: path.relative(root, reportPath), decision: report.decision, lockfileExists: report.lockfile.exists, manifestSha256: report.manifest.sha256, productionCleared: false }, null, 2));
if (report.decision.startsWith('BLOCKED')) process.exitCode = 2;
