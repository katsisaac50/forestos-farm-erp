#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps', 'api');
const report = { phase: 168, title: 'Production Release Gate & Deployment Readiness', generatedAt: new Date().toISOString(), releaseDecision: 'NOT READY — evidence incomplete', checks: [], limitations: [] };
function add(name, status, detail) { report.checks.push({ name, status, detail }); console.log(`${status} ${name}${detail ? ` — ${detail}` : ''}`); }
function run(args, cwd = root, timeout = 120000) { return spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024, env: process.env }); }
const pkgFile = path.join(api, 'package.json');
let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8')); add('API package manifest parses', 'PASS', 'Valid JSON'); }
catch (e) { add('API package manifest parses', 'FAIL', e.message); process.exitCode = 1; }
if (pkg) {
  add('Production build command declared', pkg.scripts && pkg.scripts.build === 'nest build' ? 'PASS' : 'FAIL', `build=${pkg.scripts && pkg.scripts.build}`);
  if (!(pkg.scripts && pkg.scripts.build === 'nest build')) process.exitCode = 1;
  const nestBin = path.join(api, 'node_modules', '.bin', process.platform === 'win32' ? 'nest.cmd' : 'nest');
  if (!fs.existsSync(nestBin)) { add('NestJS production build', 'NOT VERIFIED', 'Dependencies/Nest CLI absent; install dependencies and run npm run build in apps/api'); report.limitations.push('NestJS production compilation was not executed.'); }
  else { const r = spawnSync(nestBin, ['build'], { cwd: api, encoding: 'utf8', timeout: 180000, maxBuffer: 4*1024*1024 }); const ok = r.status === 0; add('NestJS production build', ok ? 'PASS' : 'FAIL', (r.stderr || r.stdout || `exit ${r.status}`).trim().slice(-1000)); if (!ok) process.exitCode = 1; }
}
const required = [164,165,166,167].map(n => `phase${n}-${({164:'transaction-integrity',165:'concurrency-recovery',166:'transaction-fault-injection',167:'recovery-idempotency'})[n]}-contract-tests.js`);
let contractsPassed = true;
for (const file of required) {
  const full = path.join(root, 'scripts', file);
  if (!fs.existsSync(full)) { add(`Required contract suite: ${file}`, 'FAIL', 'Missing test file'); contractsPassed = false; continue; }
  const r = run([full]); const ok = r.status === 0;
  const last = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split(/\r?\n/).filter(Boolean).slice(-1)[0] || `exit ${r.status}`;
  add(`Required contract suite: ${file}`, ok ? 'PASS' : 'FAIL', last);
  if (!ok) contractsPassed = false;
}
if (!contractsPassed) process.exitCode = 1;
const uri = process.env.FORESTOS_TEST_MONGODB_URI;
if (!uri) { add('Live MongoDB transaction evidence', 'NOT VERIFIED', 'FORESTOS_TEST_MONGODB_URI is not configured'); report.limitations.push('Live database transaction, rollback, concurrency, and recovery behaviour has not been verified by this gate.'); }
else {
  let parsed; try { parsed = new URL(uri); } catch {}
  const db = parsed && parsed.pathname ? decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0]) : '';
  const safe = parsed && /^mongodb(?:\+srv)?:$/.test(parsed.protocol) && /(^|[-_])(test|tests|testing|disposable|ci)([-_]|$)/i.test(db);
  add('MongoDB test target safety', safe ? 'PASS' : 'BLOCKED', safe ? 'URI protocol and disposable database marker accepted; URI not logged' : 'Database name must clearly mark a disposable test database; URI not logged');
  if (!safe) { process.exitCode = 1; report.limitations.push('Live database tests were not run because the target did not pass the disposable-database safety check.'); }
  else { add('Live MongoDB transaction evidence', 'NOT VERIFIED', 'Safety check passed, but this gate does not run destructive live integration tests automatically'); report.limitations.push('Run the opt-in live integration suites individually against the disposable replica set.'); }
}
const authFile = path.join(api, 'src', 'registry-persistence', 'registry-persistence.controller.ts');
if (fs.existsSync(authFile)) { const src = fs.readFileSync(authFile, 'utf8'); add('Registry endpoint authorization review', 'REVIEW REQUIRED', 'Controller exists; release gate does not certify tenant/role policy from source inspection'); report.limitations.push('A human security review of tenant derivation, role permissions, and endpoint exposure is still required.'); }
else { add('Registry endpoint authorization review', 'FAIL', 'Expected controller file missing'); process.exitCode = 1; }
const envExample = ['.env.example', 'apps/api/.env.example'].map(p => path.join(root,p)).find(fs.existsSync);
add('Environment configuration template', envExample ? 'PASS' : 'REVIEW REQUIRED', envExample ? path.relative(root, envExample) : 'No .env.example template found; document required production secrets and safe defaults');
if (!envExample) report.limitations.push('A reviewed environment template and production secret/configuration checklist are not confirmed.');
const failed = report.checks.some(c => c.status === 'FAIL' || c.status === 'BLOCKED');
const incomplete = report.checks.some(c => ['NOT VERIFIED','REVIEW REQUIRED','SKIP'].includes(c.status));
report.releaseDecision = failed ? 'FAIL — blocking checks failed' : incomplete ? 'NOT READY — evidence incomplete' : 'PASS — checks in this gate passed; this is not a general security certification';
const out = path.join(root, 'PHASE168_RELEASE_GATE_REPORT.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`Release decision: ${report.releaseDecision}`);
console.log(`Report written: ${path.relative(root, out)}`);
if (failed) process.exitCode = 1;
