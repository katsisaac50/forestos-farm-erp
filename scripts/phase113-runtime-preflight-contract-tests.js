#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const probe = fs.readFileSync(path.join(root, 'scripts/phase113-mongodb-runtime-preflight.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/tenant-security-regression.yml'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
  ['preflight requires a dedicated test MongoDB URI', /FORESTOS_TEST_MONGODB_URI/.test(probe)],
  ['preflight rejects database names without test or qa', /test\|qa/.test(probe) && /no connection attempted/.test(probe)],
  ['preflight uses Mongoose ping', /db\.command\(\{\s*ping:\s*1\s*\}\)/.test(probe)],
  ['preflight checks organization collection', /'organizations'/.test(probe)],
  ['preflight checks user collection', /'users'/.test(probe)],
  ['preflight checks membership collection', /'organizationmemberships'/.test(probe)],
  ['preflight is read-only and has no write/delete calls', !/insertMany|deleteMany|dropDatabase|findOneAndUpdate|\.save\(|\.create\(/.test(probe)],
  ['preflight disconnects from MongoDB in finally block', /finally\s*\{[\s\S]*mongoose\.disconnect\(\)/.test(probe)],
  ['API package exposes Phase 113 preflight command', /test:phase113:preflight/.test(JSON.stringify(pkg))],
  ['tenant workflow checks Phase 113 scripts', /phase113/.test(workflow)],
];
let failed = 0;
for (const [label, condition] of checks) {
  try { assert.ok(condition, 'contract not found'); console.log(`PASS ${label}`); }
  catch (e) { failed++; console.error(`FAIL ${label}: ${e.message}`); }
}
console.log(`\nPhase 113 runtime preflight contract: ${checks.length - failed}/${checks.length} passed.`);
console.log('Scope: static checks only; no MongoDB connection was attempted.');
if (failed) process.exitCode = 1;
