#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sameMap(a, b) { const left = a || {}; const right = b || {}; return JSON.stringify(Object.keys(left).sort().map(k => [k, left[k]])) === JSON.stringify(Object.keys(right).sort().map(k => [k, right[k]])); }
function run(argv = process.argv.slice(2)) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const root = path.resolve(arg('--root') || process.cwd());
  const apiDir = path.join(root, 'apps', 'api');
  const manifestPath = path.join(apiDir, 'package.json');
  const lockPath = path.join(apiDir, 'package-lock.json');
  const reportPath = path.resolve(arg('--report') || path.join(root, 'PHASE218_ACTUAL_API_BUILD_REPORT.json'));
  const execute = argv.includes('--execute');
  const report = { phase: 218, tool: 'actual-api-build-runner', generatedAt: new Date().toISOString(), root, executionRequested: execute, status: 'BLOCKED', installOutcome: 'not_run', buildOutcome: 'not_run', productionCleared: false, checks: [], steps: [], evidence: {} };
  const check = (name, pass, detail) => report.checks.push({ name, pass: !!pass, detail });
  try {
    if (!fs.existsSync(manifestPath)) throw new Error('Missing apps/api/package.json');
    const manifest = readJson(manifestPath);
    check('api_manifest_valid', !!manifest.name && !!manifest.version, `${manifest.name || 'unknown'}@${manifest.version || 'unknown'}`);
    check('build_script_present', !!(manifest.scripts && manifest.scripts.build), manifest.scripts?.build || 'missing');
    check('lockfile_present', fs.existsSync(lockPath), fs.existsSync(lockPath) ? 'package-lock.json exists' : 'apps/api/package-lock.json is missing');
    if (!fs.existsSync(lockPath)) throw new Error('Build blocked: package-lock.json is missing. Generate and review a trusted lockfile first.');
    const lock = readJson(lockPath);
    check('lockfile_identity', lock.name === manifest.name && lock.version === manifest.version, `${lock.name || 'unknown'}@${lock.version || 'unknown'}`);
    const lockRoot = lock.packages && lock.packages[''];
    check('lockfile_root_package_present', !!lockRoot, lockRoot ? 'packages[\"\"] exists' : 'lockfile root package entry is missing');
    const depMapsAligned = !!lockRoot && ['dependencies', 'devDependencies', 'optionalDependencies'].every(k => sameMap(manifest[k], lockRoot[k]));
    check('manifest_lockfile_dependency_maps_aligned', depMapsAligned, depMapsAligned ? 'root dependency maps match manifest' : 'dependency, devDependency, or optionalDependency maps differ');
    check('lockfile_version_supported', Number.isInteger(lock.lockfileVersion) && lock.lockfileVersion >= 2, `lockfileVersion=${lock.lockfileVersion ?? 'missing'}`);
    if (lock.name !== manifest.name || lock.version !== manifest.version) throw new Error('Build blocked: lockfile package identity does not match API manifest.');
    if (!lock.packages || !lock.packages['']) throw new Error('Build blocked: lockfile packages[\"\"] root entry is missing.');
    if (!['dependencies', 'devDependencies', 'optionalDependencies'].every(k => sameMap(manifest[k], lock.packages[''][k]))) throw new Error('Build blocked: manifest dependency maps do not match lockfile root package entry.');
    if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 2) throw new Error('Build blocked: unsupported or missing lockfile version.');
    report.evidence.manifestSha256 = hash(manifestPath);
    report.evidence.lockfileSha256 = hash(lockPath);
    report.evidence.nodeVersion = process.version;
    const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 10000 });
    report.evidence.npmVersion = npmVersion.status === 0 ? String(npmVersion.stdout).trim() : 'unavailable';
    if (!execute) {
      report.status = 'READY_NOT_EXECUTED';
      report.steps.push({ name: 'npm ci', outcome: 'not_run', detail: 'Pass --execute to run clean dependency installation and build.' });
      report.steps.push({ name: manifest.scripts.build, outcome: 'not_run', detail: 'Build is not executed in read-only mode.' });
    } else {
      const install = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'], { cwd: apiDir, encoding: 'utf8', timeout: 900000, maxBuffer: 10 * 1024 * 1024 });
      report.installOutcome = install.status === 0 ? 'success' : 'failure';
      report.steps.push({ name: 'npm ci', outcome: report.installOutcome, exitCode: install.status, signal: install.signal || null, outputTail: String((install.stdout || '') + '\n' + (install.stderr || '')).slice(-6000), error: install.error?.message || null });
      if (install.status !== 0) throw new Error(`npm ci failed (${install.status ?? install.error?.message ?? 'unknown'}); inspect steps[0].outputTail.`);
      const build = spawnSync('npm', ['run', 'build'], { cwd: apiDir, encoding: 'utf8', timeout: 900000, maxBuffer: 10 * 1024 * 1024 });
      report.buildOutcome = build.status === 0 ? 'success' : 'failure';
      report.steps.push({ name: manifest.scripts.build, outcome: report.buildOutcome, exitCode: build.status, signal: build.signal || null, outputTail: String((build.stdout || '') + '\n' + (build.stderr || '')).slice(-6000), error: build.error?.message || null });
      if (build.status !== 0) throw new Error(`API build failed (${build.status ?? build.error?.message ?? 'unknown'}); inspect build step outputTail.`);
      report.status = 'BUILD_SUCCEEDED';
    }
  } catch (e) {
    report.error = e.message;
    report.status = 'BLOCKED_OR_FAILED';
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ status: report.status, installOutcome: report.installOutcome, buildOutcome: report.buildOutcome, reportPath, error: report.error || null }, null, 2) + '\n');
  return report.status === 'BUILD_SUCCEEDED' || report.status === 'READY_NOT_EXECUTED' ? 0 : 1;
}
if (require.main === module) process.exitCode = run();
module.exports = { run };
