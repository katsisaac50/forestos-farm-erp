#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const audit = fs.readFileSync(path.join(root, 'scripts/phase114-fixture-integrity-audit.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/tenant-security-regression.yml'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [
  ['audit requires test MongoDB URI', /FORESTOS_TEST_MONGODB_URI/.test(audit)],
  ['audit refuses database names without test or qa', /test\|qa/.test(audit) && /no connection attempted/.test(audit)],
  ['audit reads known fixture organization slugs', /forestos-phase108-org-a/.test(audit) && /forestos-phase108-org-b/.test(audit)],
  ['audit reads known fixture account emails', /phase108\.owner\.a@example\.test/.test(audit) && /phase108\.suspended@example\.test/.test(audit)],
  ['audit checks password hash presence without logging secrets', /passwordHash/.test(audit) && !/console\.log\([^)]*passwordHash/.test(audit)],
  ['audit checks active and suspended memberships', /status === 'active'/.test(audit) && /status === 'suspended'/.test(audit)],
  ['audit checks string membership references', /typeof m\.userId === 'string'/.test(audit) && /typeof m\.organizationId === 'string'/.test(audit)],
  ['audit contains no mutation or drop operations', !/insertMany|deleteMany|dropDatabase|findOneAndUpdate|\.save\(|\.create\(/.test(audit)],
  ['audit disconnects from MongoDB', /finally\s*\{[\s\S]*mongoose\.disconnect\(\)/.test(audit)],
  ['API package exposes Phase 114 audit command', /test:phase114:integrity/.test(JSON.stringify(pkg))],
  ['tenant regression workflow invokes Phase 114 contract tests', /phase114-fixture-integrity-contract-tests\.js/.test(workflow)],
];
let failed = 0;
for (const [label, condition] of checks) {
  try { assert.ok(condition, 'contract not found'); console.log(`PASS ${label}`); }
  catch (e) { failed++; console.error(`FAIL ${label}: ${e.message}`); }
}
console.log(`\nPhase 114 fixture integrity contract: ${checks.length - failed}/${checks.length} passed.`);
console.log('Scope: static checks only; the database audit was not run.');
if (failed) process.exitCode = 1;
