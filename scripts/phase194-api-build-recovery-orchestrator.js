#!/usr/bin/env node
'use strict';
// Phase 194: explicit, bounded dependency installation and real API build orchestration.
// Default mode is read-only. No production deployment or database access is performed.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const rootArg = process.argv.find(a => a.startsWith('--root='));
const root = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const manifestPath = path.join(api, 'package.json');
const lockPath = path.join(api, 'package-lock.json');
const modeArg = process.argv.find(a => ['--preflight','--install','--build','--all'].includes(a));
const mode = modeArg ? modeArg.slice(2) : 'preflight';
const installTimeout = Math.max(10000, Math.min(Number(process.env.FORESTOS_PHASE194_INSTALL_TIMEOUT_MS) || 300000, 600000));
const buildTimeout = Math.max(10000, Math.min(Number(process.env.FORESTOS_PHASE194_BUILD_TIMEOUT_MS) || 180000, 300000));
const reportPath = path.join(root, 'PHASE194_API_BUILD_RECOVERY_REPORT.json');
function fail(message) { console.error(`BLOCKED: ${message}`); process.exitCode = 2; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function lockAligned(pkg) {
  const lock = readJson(lockPath);
  return Boolean(lock && Number.isInteger(lock.lockfileVersion) && lock.packages && lock.packages[''] && lock.packages[''].name === pkg.name && lock.packages[''].version === pkg.version);
}
function runNpm(args, timeout) {
  const result = spawnSync('npm', args, { cwd: api, encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024, env: process.env });
  return { succeeded: result.status === 0 && !result.error, exitCode: result.status, timedOut: result.error?.code === 'ETIMEDOUT', detail: (result.error?.message || `${result.stderr || ''}\n${result.stdout || ''}`.trim()).slice(-1200) };
}
if (!fs.existsSync(manifestPath)) { fail('apps/api/package.json is missing.'); process.exit(); }
const pkg = readJson(manifestPath);
if (!pkg || !pkg.name || !pkg.version || !pkg.scripts || !pkg.scripts.build) { fail('API package manifest is invalid or lacks a build script.'); process.exit(); }
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 5000 });
if (npmVersion.status !== 0 || npmVersion.error) { fail('npm is unavailable.'); process.exit(); }
const report = {
  phase: 194, title: 'Dependency Recovery & Actual API Compilation Orchestrator', generatedAt: new Date().toISOString(), mode,
  apiPackage: `${pkg.name}@${pkg.version}`, npmVersion: npmVersion.stdout.trim(),
  lockfile: { exists: fs.existsSync(lockPath), aligned: lockAligned(pkg) },
  install: { attempted: false, succeeded: false, detail: 'not run' },
  build: { attempted: false, succeeded: false, detail: 'not run' },
  productionCleared: false, nextActions: []
};
if (mode === 'install' || mode === 'all') {
  if (!report.lockfile.aligned) { report.install.detail = 'blocked: aligned package-lock.json is required; generate/review it first.'; fail(report.install.detail); }
  else {
    report.install.attempted = true;
    report.install = { ...report.install, ...runNpm(['ci', '--ignore-scripts', '--no-audit', '--no-fund'], installTimeout) };
    if (!report.install.succeeded) fail(`npm ci did not succeed (${report.install.timedOut ? 'timeout' : 'process failure'}).`);
  }
}
if (mode === 'build' || (mode === 'all' && report.install.succeeded)) {
  const nestCli = path.join(api, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js');
  if (!fs.existsSync(nestCli)) { report.build.detail = 'blocked: local @nestjs/cli is missing; perform a successful clean install first.'; fail(report.build.detail); }
  else if (mode === 'all' && !report.install.succeeded) { report.build.detail = 'blocked because clean install did not succeed.'; fail(report.build.detail); }
  else {
    report.build.attempted = true;
    report.build = { ...report.build, ...runNpm(['run', 'build'], buildTimeout) };
    if (!report.build.succeeded) fail(`npm run build did not succeed (${report.build.timedOut ? 'timeout' : 'process failure'}).`);
  }
}
if (mode === 'preflight') report.nextActions.push(report.lockfile.aligned ? 'Run --install to execute a clean npm ci, then --build to compile the NestJS API.' : 'Generate and review an aligned apps/api/package-lock.json in a registry-enabled environment, then rerun preflight.');
if (mode === 'install' && report.install.succeeded) report.nextActions.push('Run with --build to execute the actual NestJS API compilation.');
if (mode === 'build' && report.build.succeeded) report.nextActions.push('Review build output and run controlled live authentication, authorization and tenant-isolation tests.');
if (mode === 'all' && report.install.succeeded && report.build.succeeded) report.nextActions.push('Clean install and API build completed; live security and deployment checks are still required.');
report.nextActions.push('This report never grants production clearance; runtime, database, authorization and deployment checks remain separate gates.');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if ((mode === 'install' || mode === 'all') && !report.install.succeeded) process.exitCode = 2;
if ((mode === 'build' || mode === 'all') && !report.build.succeeded) process.exitCode = 2;
