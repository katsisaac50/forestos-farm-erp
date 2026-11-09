#!/usr/bin/env node
'use strict';
// Phase 193: explicit, bounded lockfile recovery. No network mutation unless opted in.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const manifestPath = path.join(api, 'package.json');
const lockPath = path.join(api, 'package-lock.json');
const generate = process.argv.includes('--generate-lockfile');
const timeoutMs = Math.max(5000, Math.min(Number(process.env.FORESTOS_PHASE193_TIMEOUT_MS) || 20000, 25000));
function stop(message) { console.error(`BLOCKED: ${message}`); process.exit(2); }
if (!fs.existsSync(manifestPath)) stop('apps/api/package.json is missing.');
let pkg;
try { pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { stop(`Invalid API manifest: ${e.message}`); }
if (!pkg.name || !pkg.version || !pkg.dependencies || !pkg.devDependencies) stop('API manifest lacks required package metadata or dependency groups.');
const npm = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 5000 });
if (npm.status !== 0 || npm.error) stop('npm is unavailable.');
let lockfileResult = { requested: generate, attempted: false, succeeded: false, detail: generate ? 'not run' : 'skipped; pass --generate-lockfile to opt in' };
if (generate) {
  lockfileResult.attempted = true;
  // Do not overwrite an existing lockfile; recovery should be deliberate and reviewable.
  if (fs.existsSync(lockPath)) stop('A package-lock.json already exists; inspect it instead of overwriting it.');
  const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', `--fetch-timeout=${timeoutMs}`], {
    cwd: api, encoding: 'utf8', timeout: timeoutMs + 3000, maxBuffer: 1024 * 1024, env: process.env,
  });
  const created = fs.existsSync(lockPath);
  let parsed = null;
  if (created) { try { parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch {} }
  const aligned = Boolean(parsed && Number.isInteger(parsed.lockfileVersion) && parsed.packages && parsed.packages[''] && parsed.packages[''].name === pkg.name && parsed.packages[''].version === pkg.version);
  lockfileResult.succeeded = result.status === 0 && !result.error && aligned;
  lockfileResult.detail = lockfileResult.succeeded ? `Generated aligned npm lockfile v${parsed.lockfileVersion}; review before committing.` : (result.error?.code === 'ETIMEDOUT' ? 'Timed out; inspect registry connectivity. Any partial lockfile requires review and must not be trusted automatically.' : (result.error?.message || (result.stderr || result.stdout || `npm exited ${result.status}`).trim().slice(-600)));
  if (created && !aligned) lockfileResult.detail += ' A file was created but failed alignment validation; inspect or remove it manually before retrying.';
}
let existingLock = null;
if (fs.existsSync(lockPath)) { try { existingLock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch {} }
const existingAligned = Boolean(existingLock && Number.isInteger(existingLock.lockfileVersion) && existingLock.packages && existingLock.packages[''] && existingLock.packages[''].name === pkg.name && existingLock.packages[''].version === pkg.version);
const report = {
  phase: 193,
  title: 'Lockfile Recovery Gate & Registry-Enabled Bootstrap',
  generatedAt: new Date().toISOString(),
  apiPackage: `${pkg.name}@${pkg.version}`,
  npmVersion: npm.stdout.trim(),
  existingLockfile: { exists: fs.existsSync(lockPath), aligned: existingAligned },
  lockfileGeneration: lockfileResult,
  cleanInstallExecuted: false,
  buildExecuted: false,
  productionCleared: false,
  nextActions: [],
};
if (lockfileResult.succeeded || existingAligned) report.nextActions.push('Review the lockfile diff, then run npm ci --no-audit --no-fund and npm run build from apps/api.');
else report.nextActions.push('Run this script with --generate-lockfile in a registry-enabled environment; review the generated file before clean install.');
report.nextActions.push('Do not treat lockfile generation as proof of a successful clean install or build.');
fs.writeFileSync(path.join(root, 'PHASE193_LOCKFILE_RECOVERY_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (generate && !lockfileResult.succeeded) process.exitCode = 2;
