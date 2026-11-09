#!/usr/bin/env node
'use strict';
// Phase 192: diagnose dependency-resolution blockers. Network access is opt-in.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const pkgPath = path.join(api, 'package.json');
const lockPath = path.join(api, 'package-lock.json');
const checkRegistry = process.argv.includes('--check-registry');
const timeoutMs = Math.max(1000, Math.min(Number(process.env.FORESTOS_PHASE192_TIMEOUT_MS) || 12000, 30000));
const checks = [];
function add(name, passed, detail) { checks.push({ name, passed: Boolean(passed), detail }); }
function fail(message) { console.error(`BLOCKED: ${message}`); process.exit(2); }
if (!fs.existsSync(pkgPath)) fail('apps/api/package.json is missing.');
let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch (e) { fail(`API manifest is invalid JSON: ${e.message}`); }
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const duplicateNames = Object.keys(pkg.dependencies || {}).filter(k => Object.hasOwn(pkg.devDependencies || {}, k));
add('API manifest has package name and version', Boolean(pkg.name && pkg.version), `${pkg.name || '(missing name)'}@${pkg.version || '(missing version)'}`);
add('Build script is declared', typeof pkg.scripts?.build === 'string' && pkg.scripts.build.length > 0, pkg.scripts?.build || 'missing build script');
add('Dependency declarations are non-empty', Object.keys(deps).length > 0, `${Object.keys(deps).length} declared packages`);
add('No dependency is duplicated across dependency groups', duplicateNames.length === 0, duplicateNames.length ? `duplicates: ${duplicateNames.join(', ')}` : 'no duplicate keys across dependencies/devDependencies');
let lock = null, lockError = null;
if (fs.existsSync(lockPath)) {
  try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (e) { lockError = e.message; }
}
const lockValid = Boolean(lock && Number.isInteger(lock.lockfileVersion) && lock.packages && lock.packages[''] && (!lock.packages[''].name || lock.packages[''].name === pkg.name));
add('Real API npm lockfile exists and aligns with manifest', lockValid, lockValid ? `npm lockfile v${lock.lockfileVersion}` : (lockError ? `malformed lockfile: ${lockError}` : 'missing or invalid apps/api/package-lock.json'));
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8', timeout: 5000 });
add('npm executable is available', npmVersion.status === 0, npmVersion.status === 0 ? npmVersion.stdout.trim() : (npmVersion.error?.message || 'npm --version failed'));
let registryCheck = { requested: checkRegistry, checked: false, passed: null, detail: checkRegistry ? 'not run' : 'skipped; pass --check-registry to opt in' };
if (checkRegistry) {
  const ping = spawnSync('npm', ['ping', '--fetch-retries=0', `--fetch-timeout=${timeoutMs}`], { cwd: api, encoding: 'utf8', timeout: timeoutMs + 2000, maxBuffer: 1024 * 1024, env: process.env });
  registryCheck.checked = true;
  registryCheck.passed = ping.status === 0 && !ping.error;
  registryCheck.detail = registryCheck.passed ? 'npm registry ping succeeded' : (ping.error?.code === 'ETIMEDOUT' ? 'npm registry ping timed out' : (ping.error?.message || (ping.stderr || ping.stdout || `npm ping exited ${ping.status}`).trim().slice(-500)));
}
const report = {
  phase: 192,
  title: 'Dependency Resolution Diagnostics & Lockfile Recovery',
  generatedAt: new Date().toISOString(),
  apiPackage: pkg.name,
  declaredDependencyCount: Object.keys(deps).length,
  registry: registryCheck,
  checks,
  passed: checks.filter(c => c.passed).length,
  total: checks.length,
  cleanInstallExecuted: false,
  buildExecuted: false,
  productionCleared: false,
  blockers: checks.filter(c => !c.passed).map(c => c.name),
  nextActions: []
};
if (!lockValid) report.nextActions.push('Run npm run bootstrap:phase190:lockfile in a registry-enabled environment; inspect the generated lockfile and commit it.');
if (checkRegistry && !registryCheck.passed) report.nextActions.push('Resolve DNS/proxy/registry connectivity, then rerun with --check-registry.');
if (lockValid) report.nextActions.push('Run npm ci --no-audit --no-fund, then npm run build from apps/api and retain command output.');
if (!report.nextActions.length) report.nextActions.push('Review the dependency tree and perform clean-install/build verification in CI.');
const reportPath = path.join(root, 'PHASE192_DEPENDENCY_RECOVERY_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.blockers.length || (registryCheck.checked && !registryCheck.passed)) process.exitCode = 2;
