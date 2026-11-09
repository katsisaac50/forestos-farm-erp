#!/usr/bin/env node
'use strict';
// Phase 201: explicit, evidence-producing dependency install/build gate.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const reportPath = path.join(root, 'PHASE201_TRUSTED_BUILD_EXECUTION_REPORT.json');
const args = new Set(process.argv.slice(2));
const mode = args.has('--install') ? 'install' : args.has('--build') ? 'build' : 'preflight';
const readJson = p => { try { return { ok: true, value: JSON.parse(fs.readFileSync(p, 'utf8')) }; } catch (e) { return { ok: false, error: e.message }; } };
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const report = { phase: 201, title: 'Trusted Build Execution Gate', generatedAt: new Date().toISOString(), mode, productionCleared: false, installExecuted: false, buildExecuted: false, installExitCode: null, buildExitCode: null, checks: {}, evidence: {}, blockers: [], nextActions: [] };
function run(command, commandArgs, timeout = 120000) {
  const result = spawnSync(command, commandArgs, { cwd: api, encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, CI: '1' } });
  return { status: result.status, signal: result.signal || null, error: result.error ? result.error.message : null, stdout: (result.stdout || '').slice(-12000), stderr: (result.stderr || '').slice(-12000) };
}
try {
  const manifestPath = path.join(api, 'package.json');
  const manifest = readJson(manifestPath);
  report.checks.manifestValid = manifest.ok && !!(manifest.value.name && manifest.value.version && manifest.value.scripts && manifest.value.scripts.build);
  if (manifest.ok) report.evidence.manifest = { path: 'apps/api/package.json', name: manifest.value.name, version: manifest.value.version, sha256: sha(manifestPath) };
  else report.blockers.push('API package manifest is invalid: ' + manifest.error);
  const lockPath = path.join(api, 'package-lock.json');
  report.checks.lockfileExists = fs.existsSync(lockPath);
  report.checks.lockfileAligned = false;
  if (report.checks.lockfileExists && manifest.ok) {
    const lock = readJson(lockPath);
    const p = lock.ok && lock.value.packages && lock.value.packages[''];
    report.checks.lockfileAligned = !!(p && p.name === manifest.value.name && p.version === manifest.value.version && JSON.stringify(p.dependencies || {}) === JSON.stringify(manifest.value.dependencies || {}) && JSON.stringify(p.devDependencies || {}) === JSON.stringify(manifest.value.devDependencies || {}));
    report.evidence.lockfile = lock.ok ? { sha256: sha(lockPath), lockfileVersion: lock.value.lockfileVersion, aligned: report.checks.lockfileAligned } : { parseError: lock.error };
  }
  if (!report.checks.lockfileExists) report.blockers.push('Missing apps/api/package-lock.json; install mode is blocked to preserve reproducibility.');
  else if (!report.checks.lockfileAligned) report.blockers.push('Lockfile is invalid or not aligned with the API manifest.');
  report.checks.nodeModulesExists = fs.existsSync(path.join(api, 'node_modules'));
  report.checks.nestCliExists = fs.existsSync(path.join(api, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js'));
  const node = spawnSync(process.execPath, ['--version'], { encoding: 'utf8', timeout: 3000 });
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 3000 });
  report.evidence.runtime = { node: node.status === 0 ? node.stdout.trim() : null, npm: npm.status === 0 ? npm.stdout.trim() : null };
  if (mode === 'install') {
    if (!report.checks.manifestValid || !report.checks.lockfileAligned) throw new Error('Install refused: valid manifest and aligned lockfile are required.');
    report.installExecuted = true;
    report.evidence.install = run(npmCmd, ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=15000'], 120000);
    report.installExitCode = report.evidence.install.status;
    if (report.installExitCode !== 0) report.blockers.push('npm ci did not complete successfully; inspect evidence.install output/error.');
  } else if (mode === 'build') {
    if (!report.checks.manifestValid || !report.checks.lockfileAligned || !report.checks.nodeModulesExists || !report.checks.nestCliExists) throw new Error('Build refused: manifest, aligned lockfile, installed dependencies, and local NestJS CLI are required.');
    report.buildExecuted = true;
    report.evidence.build = run(npmCmd, ['run', 'build'], 120000);
    report.buildExitCode = report.evidence.build.status;
    if (report.buildExitCode !== 0) report.blockers.push('NestJS API build did not complete successfully; inspect evidence.build output/error.');
  }
  report.checks.installPrerequisites = report.checks.manifestValid && report.checks.lockfileAligned;
  report.checks.buildPrerequisites = report.checks.installPrerequisites && report.checks.nodeModulesExists && report.checks.nestCliExists;
  if (!report.checks.lockfileExists) report.nextActions.push('Obtain a genuine lockfile from trusted version control/CI or generate it in a registry-enabled environment; independently verify provenance.');
  if (mode === 'preflight') report.nextActions.push('After lockfile verification, run node scripts/phase201_trusted_build_execution_gate.js --install, then --build.');
  if (report.installExecuted && report.installExitCode === 0) report.nextActions.push('Run the build mode and preserve compiler evidence.');
  report.nextActions.push('Keep production clearance disabled until runtime, database, authentication, security, and deployment checks pass.');
  report.status = report.buildExecuted && report.buildExitCode === 0 ? 'BUILD_PASSED_NOT_PRODUCTION_CLEARED' : report.installExecuted && report.installExitCode === 0 ? 'INSTALL_PASSED_BUILD_PENDING' : (report.checks.buildPrerequisites ? 'READY_FOR_EXPLICIT_BUILD' : 'BLOCKED_DEPENDENCY_OR_BUILD_PREREQUISITES');
} catch (e) {
  report.status = 'BLOCKED_EXECUTION_GATE'; report.blockers.push(e.message);
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status.startsWith('BLOCKED')) process.exitCode = 2;
