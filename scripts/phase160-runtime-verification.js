#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const report = { phase: 160, title: 'Runtime Verification Orchestrator', generatedAt: new Date().toISOString(), checks: [], limitations: [] };
function add(name, status, detail) { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); }
function run(command, args, cwd, timeout = 120000) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', timeout, env: process.env, maxBuffer: 4 * 1024 * 1024 });
}
const pkgPath = path.join(api, 'package.json');
if (!fs.existsSync(pkgPath)) { add('API package manifest', 'FAIL', 'apps/api/package.json missing'); process.exitCode = 1; }
else {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  add('API build command declared', pkg.scripts && pkg.scripts.build === 'nest build' ? 'PASS' : 'FAIL', `build=${pkg.scripts && pkg.scripts.build}`);
  if (!(pkg.scripts && pkg.scripts.build === 'nest build')) process.exitCode = 1;
  const depsDir = path.join(api, 'node_modules');
  const nestBin = path.join(depsDir, '.bin', process.platform === 'win32' ? 'nest.cmd' : 'nest');
  if (!fs.existsSync(depsDir) || !fs.existsSync(nestBin)) {
    add('NestJS build execution', 'SKIP', 'dependencies or Nest CLI are not installed; run npm ci/install in apps/api');
    report.limitations.push('NestJS compilation was not executed because dependencies are not installed.');
  } else {
    const result = run(process.execPath, [nestBin, 'build'], api, 180000);
    const ok = result.status === 0;
    add('NestJS build execution', ok ? 'PASS' : 'FAIL', (result.stderr || result.stdout || `exit ${result.status}`).trim().slice(-1200));
    if (!ok) process.exitCode = 1;
  }
}
const uri = process.env.FORESTOS_TEST_MONGODB_URI;
if (!uri) {
  add('Live MongoDB integration', 'SKIP', 'FORESTOS_TEST_MONGODB_URI not set');
  report.limitations.push('Live MongoDB integration tests were not run.');
} else {
  let parsed;
  try { parsed = new URL(uri); } catch { parsed = null; }
  const dbName = parsed && parsed.pathname ? decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0]) : '';
  const looksDisposable = /(^|[-_])(test|tests|testing|disposable|ci)([-_]|$)/i.test(dbName) || /^forestos_test/i.test(dbName);
  if (!parsed || !/^mongodb(?:\+srv)?:$/.test(parsed.protocol) || !looksDisposable) {
    add('Live MongoDB safety gate', 'BLOCKED', 'database name must clearly identify a disposable test database; URI was not printed');
    report.limitations.push('Live MongoDB run blocked by safety gate; use a disposable database name containing test/tests/testing/disposable/ci.');
  } else {
    const result = run(process.execPath, [path.join(root, 'scripts', 'phase156-mongodb-integration-tests.js')], root, 180000);
    const ok = result.status === 0;
    add('Live MongoDB integration', ok ? 'PASS' : 'FAIL', (result.stderr || result.stdout || `exit ${result.status}`).trim().slice(-1200));
    if (!ok) process.exitCode = 1;
  }
}
const out = path.join(root, 'PHASE160_RUNTIME_VERIFICATION.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`Report written: ${path.relative(root, out)}`);
if (report.checks.some(x => x.status === 'FAIL' || x.status === 'BLOCKED')) process.exitCode = 1;
