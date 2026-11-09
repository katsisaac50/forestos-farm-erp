#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const probe = fs.readFileSync(path.join(root, 'scripts/phase110-live-readiness-probe.js'), 'utf8');
const health = fs.readFileSync(path.join(root, 'apps/api/src/health.controller.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.controller.ts'), 'utf8');
const checks = [
  ['live probe uses the application liveness endpoint', /endpoint\('health'\)/.test(probe) && /@Get\(\)/.test(health)],
  ['live probe checks readiness but reports database status honestly', /endpoint\('health\/ready'\)/.test(probe) && /database check=\$\{database\}/.test(probe) && /database: 'not_checked'/.test(health)],
  ['live probe logs in through the actual auth route', /endpoint\('auth\/login'\)/.test(probe) && /@Post\('login'\)/.test(auth)],
  ['live probe validates bearer identity through /auth/me', /endpoint\('auth\/me'\)/.test(probe) && /@Get\('me'\)/.test(auth)],
  ['non-local target is blocked by default', /FORESTOS_ALLOW_NONLOCAL_TEST_TARGET/.test(probe) && /Non-local target blocked/.test(probe)],
  ['probe requires three distinct fixture accounts', /FORESTOS_TEST_TENANT_A_EMAIL/.test(probe) && /FORESTOS_TEST_TENANT_B_EMAIL/.test(probe) && /FORESTOS_TEST_SUSPENDED_EMAIL/.test(probe) && /must have distinct emails/.test(probe)],
  ['probe does not print secrets or mutate records', !/console\.(log|error)\([^)]*password/i.test(probe) && !/deleteMany|dropDatabase|findOneAndUpdate|\.create\(/.test(probe)],
  ['probe explicitly limits its claims to authentication readiness', /does not prove database readiness or tenant isolation/.test(probe)],
];
let failed = 0;
for (const [label, condition] of checks) {
  try { assert.ok(condition, 'expected safety/contract not found'); console.log(`PASS ${label}`); }
  catch (e) { failed++; console.error(`FAIL ${label}: ${e.message}`); }
}
console.log(`\nPhase 110 live-probe contract: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
