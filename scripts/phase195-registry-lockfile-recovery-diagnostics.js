#!/usr/bin/env node
'use strict';
// Phase 195: evidence-based npm registry and lockfile recovery diagnostics.
// Default mode is offline/read-only. --check-registry explicitly opts into a bounded network probe.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const manifestPath = path.join(api, 'package.json');
const lockPath = path.join(api, 'package-lock.json');
const checkRegistry = process.argv.includes('--check-registry');
const timeoutMs = Math.max(3000, Math.min(Number(process.env.FORESTOS_PHASE195_REGISTRY_TIMEOUT_MS) || 10000, 15000));
function run(command, args, timeout) {
  const r = spawnSync(command, args, { cwd: api, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, env: process.env });
  return { succeeded: r.status === 0 && !r.error, exitCode: r.status, timedOut: r.error?.code === 'ETIMEDOUT', detail: (r.error?.message || `${r.stderr || ''}\n${r.stdout || ''}`.trim()).slice(-800) };
}
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { __error: e.message }; } }
const report = { phase: 195, title: 'Registry & Lockfile Recovery Diagnostics', generatedAt: new Date().toISOString(), mode: checkRegistry ? 'registry-check' : 'offline-preflight', registry: { checked: false, succeeded: false, detail: 'not checked; pass --check-registry to opt in' }, manifest: { exists: fs.existsSync(manifestPath), valid: false }, lockfile: { exists: fs.existsSync(lockPath), validJson: false, aligned: false }, cleanInstallExecuted: false, buildExecuted: false, productionCleared: false, nextActions: [] };
if (!report.manifest.exists) report.nextActions.push('Restore apps/api/package.json from a trusted project source.');
else {
 const pkg = readJson(manifestPath); report.manifest.valid = !pkg.__error && Boolean(pkg.name && pkg.version && pkg.dependencies && pkg.devDependencies && pkg.scripts?.build);
 if (!report.manifest.valid) report.nextActions.push('Repair or review the API package manifest before dependency recovery.');
 if (report.lockfile.exists) {
  const lock = readJson(lockPath); report.lockfile.validJson = !lock.__error;
  report.lockfile.aligned = report.lockfile.validJson && Number.isInteger(lock.lockfileVersion) && lock.packages?.['']?.name === pkg.name && lock.packages?.['']?.version === pkg.version;
 }
}
if (checkRegistry) {
 const npmVersion = run('npm', ['--version'], 4000);
 if (!npmVersion.succeeded) report.registry = { checked: true, succeeded: false, detail: 'npm unavailable or failed version probe' };
 else report.registry = { checked: true, ...run('npm', ['ping', '--fetch-retries=0', `--fetch-timeout=${timeoutMs}`], timeoutMs + 2000) };
}
if (!report.lockfile.aligned) report.nextActions.push('Run the lockfile bootstrap only in a registry-enabled environment; review the resulting lockfile before clean installation.');
else report.nextActions.push('Review and commit the aligned lockfile, then run npm ci --ignore-scripts --no-audit --no-fund and npm run build.');
if (checkRegistry && !report.registry.succeeded) report.nextActions.push('Investigate DNS, proxy/firewall, npm registry access, or environment network restrictions; do not fabricate a lockfile.');
report.nextActions.push('This diagnostic does not install dependencies, compile the API, test live services, or clear production.');
fs.writeFileSync(path.join(root, 'PHASE195_REGISTRY_LOCKFILE_RECOVERY_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.manifest.valid) process.exitCode = 2;
if (checkRegistry && !report.registry.succeeded) process.exitCode = 2;
