#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const access = fs.readFileSync(path.join(root, 'apps/api/src/organizations/organization-access.service.ts'), 'utf8');
const membership = fs.readFileSync(path.join(root, 'apps/api/src/organizations/organization-membership.schema.ts'), 'utf8');
const seeder = fs.readFileSync(path.join(root, 'scripts/phase108-seed-test-fixtures.js'), 'utf8');
const probe = fs.readFileSync(path.join(root, 'scripts/phase110-live-readiness-probe.js'), 'utf8');
const checks = [
  ['membership schema declares string userId and organizationId', /userId!:\s*string/.test(membership) && /organizationId!:\s*string/.test(membership)],
  ['context resolver queries membership using canonical string IDs', /userId:\s*String\(userId\)/.test(access) && /organizationId:\s*String\(requestedOrganizationId\)/.test(access)],
  ['membership organization IDs are converted to ObjectIds only for organization _id lookup', /organizationIds\.map\(\(id: string\) => new Types\.ObjectId\(id\)\)/.test(access)],
  ['organization listing returns canonical role or normalized legacy roles', /roles:\s*Array\.isArray\(m\.roles\)/.test(access) && /typeof m\.role === 'string'/.test(access)],
  ['suspended membership remains excluded by active status filter', /status:\s*'active'/.test(access) && /status:\s*'suspended'/.test(seeder)],
  ['test seeder continues to store membership references as strings', /userId:\s*String\(userA\._id\)/.test(seeder) && /organizationId:\s*String\(orgA\._id\)/.test(seeder)],
  ['live probe remains non-mutating and tests login identity', /endpoint\('auth\/login'\)/.test(probe) && /endpoint\('auth\/me'\)/.test(probe) && !/deleteMany|dropDatabase|findOneAndUpdate|\.create\(/.test(probe)],
  ['database-backed verification is explicitly still required', /does not prove database readiness or tenant isolation/.test(probe)],
];
let failed = 0;
for (const [label, condition] of checks) {
  try { assert.ok(condition, 'expected membership/data contract not found'); console.log(`PASS ${label}`); }
  catch (e) { failed++; console.error(`FAIL ${label}: ${e.message}`); }
}
console.log(`\nPhase 111 membership reference contract: ${checks.length - failed}/${checks.length} passed.`);
console.log('Scope: static source checks only; run MongoDB-backed tests before relying on runtime behavior.');
if (failed) process.exitCode = 1;
