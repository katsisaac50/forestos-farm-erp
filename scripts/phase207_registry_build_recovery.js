#!/usr/bin/env node
'use strict';
// Phase 207: bounded registry probe and truthful dependency/build recovery gate.
// Default is read-only. Network and package operations require explicit flags.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const manifestPath = path.join(apiDir, 'package.json');
const lockPath = path.join(apiDir, 'package-lock.json');
const reportPath = path.join(root, 'PHASE207_REGISTRY_BUILD_RECOVERY_REPORT.json');
const args = process.argv.slice(2);
const has = (x) => args.includes(x);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const report = {
  phase: 207, title: 'Registry Connectivity & Build Recovery', generatedAt: new Date().toISOString(),
  node: process.version, platform: `${os.platform()}-${os.arch()}`, networkProbeRequested: has('--probe-registry'),
  installRequested: has('--install'), buildRequested: has('--build'), registryReachable: null,
  installExecuted: false, installExitCode: null, buildExecuted: false, buildExitCode: null,
  productionCleared: false, blockers: [], nextActions: []
};
function run(command, argv, timeoutMs) {
  const r = spawnSync(command, argv, { cwd: apiDir, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
  return { status: r.status, signal: r.signal || null, error: r.error ? r.error.message : null, stdout: (r.stdout || '').slice(-5000), stderr: (r.stderr || '').slice(-5000) };
}
try {
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  report.manifest = { name: manifest.name, version: manifest.version, sha256: sha256(manifestBytes) };
  if (manifest.name !== 'forestos-api') report.blockers.push('Unexpected API package name.');
  if (!fs.existsSync(lockPath)) {
    report.lockfile = { exists: false };
    report.blockers.push('apps/api/package-lock.json is missing; clean install and build are blocked.');
  } else {
    const lockBytes = fs.readFileSync(lockPath);
    const lock = JSON.parse(lockBytes.toString('utf8'));
    const lr = lock.packages && lock.packages[''];
    const aligned = !!lr && [2, 3].includes(lock.lockfileVersion) && lr.name === manifest.name && lr.version === manifest.version && JSON.stringify(lr.dependencies || {}) === JSON.stringify(manifest.dependencies || {}) && JSON.stringify(lr.devDependencies || {}) === JSON.stringify(manifest.devDependencies || {});
    report.lockfile = { exists: true, sha256: sha256(lockBytes), lockfileVersion: lock.lockfileVersion || null, manifestAligned: aligned };
    if (!aligned) report.blockers.push('Existing lockfile is not aligned with the API manifest.');
  }
  if (has('--probe-registry')) {
    const probe = run('npm', ['ping', '--fetch-retries=0', '--fetch-timeout=8000'], 10000);
    report.registryProbe = probe;
    report.registryReachable = probe.status === 0;
    if (!report.registryReachable) report.blockers.push(`npm registry probe failed${probe.error ? `: ${probe.error}` : ` (exit ${probe.status})`}.`);
  }
  if (has('--install')) {
    if (!report.lockfile.exists || !report.lockfile.manifestAligned) {
      report.blockers.push('Install skipped because a valid aligned lockfile is unavailable.');
    } else {
      report.installExecuted = true;
      report.install = run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=10000'], 120000);
      report.installExitCode = report.install.status;
      if (report.install.status !== 0) report.blockers.push('npm ci did not complete successfully.');
    }
  }
  if (has('--build')) {
    if (!report.installExecuted && !fs.existsSync(path.join(apiDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'))) {
      report.blockers.push('Build skipped because local NestJS CLI/dependencies are unavailable; run a successful clean install first.');
    } else if (report.installExecuted && report.installExitCode !== 0) {
      report.blockers.push('Build skipped because the requested clean installation failed.');
    } else {
      report.buildExecuted = true;
      report.build = run('npm', ['run', 'build', '--if-present'], 120000);
      report.buildExitCode = report.build.status;
      if (report.build.status !== 0) report.blockers.push('NestJS API build failed or timed out.');
    }
  }
  report.status = report.buildExecuted && report.buildExitCode === 0 ? 'BUILD_COMMAND_SUCCEEDED_REQUIRES_RUNTIME_TESTS' : report.registryReachable === false ? 'BLOCKED_REGISTRY_UNAVAILABLE' : report.lockfile && !report.lockfile.exists ? 'BLOCKED_MISSING_LOCKFILE' : 'PREFLIGHT_COMPLETE';
} catch (e) {
  report.status = 'ERROR';
  report.blockers.push(`Recovery gate error: ${e.message}`);
}
report.nextActions.push('If registry access fails, obtain the lockfile from a trusted Git/CI artifact or rerun the registry probe in a network-enabled environment.');
report.nextActions.push('Do not run npm ci until the lockfile source and manifest alignment have been reviewed.');
report.nextActions.push('After a successful build, run API runtime, authentication, tenant-isolation, and database integration tests.');
report.nextActions.push('This report does not establish production readiness.');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status === 'ERROR' || report.registryReachable === false || (has('--install') && report.installExitCode !== 0) || (has('--build') && (!report.buildExecuted || report.buildExitCode !== 0))) process.exitCode = 2;
