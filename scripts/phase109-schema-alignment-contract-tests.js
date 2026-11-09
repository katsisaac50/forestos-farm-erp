#!/usr/bin/env node
'use strict';

/**
 * Phase 109 schema-alignment contract.
 * Static source contract only: it does not connect to MongoDB or prove runtime behavior.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const files = {
  organization: read('apps/api/src/organizations/organization.schema.ts'),
  membership: read('apps/api/src/organizations/organization-membership.schema.ts'),
  user: read('apps/api/src/auth/user.schema.ts'),
  plantation: read('apps/api/src/plantations/plantation.schema.ts'),
  hive: read('apps/api/src/hives/hive.schema.ts'),
  seeder: read('scripts/phase108-seed-test-fixtures.js'),
};
const checks = [
  ['organization fixture fields match schema requirements', /slug:\s*\{[^}]*required:\s*true/.test(files.seeder) && /name:\s*\{[^}]*required:\s*true/.test(files.seeder) && /createdBy:\s*\{[^}]*required:\s*true/.test(files.seeder) && /@Prop\(\{required:true,trim:true,maxlength:120\}\)\s*createdBy/.test(files.organization)],
  ['organization slug fixture values satisfy schema pattern', /forestos-phase108-org-a/.test(files.seeder) && /forestos-phase108-org-b/.test(files.seeder) && /a-z0-9-\]\{2,62\}/.test(files.organization)],
  ['user fixture role values are allowed by application schema', /enum:\s*\['owner','field_worker'\]/.test(files.user) && /role:\s*'owner'/.test(files.seeder) && /role:\s*'field_worker'/.test(files.seeder) && !/passwordHash,\s*role:\s*'viewer'/.test(files.seeder)],
  ['user fixture uses application password hash field and bcrypt', /passwordHash/.test(files.user) && /passwordHash/.test(files.seeder) && /bcrypt\.hash\(password, 12\)/.test(files.seeder)],
  ['membership fixture role and status match application enums', /enum:\['owner','admin','manager','field_worker','finance','viewer'\]/.test(files.membership) && /role:\s*'viewer',\s*status:\s*'suspended'/.test(files.seeder) && /enum:\['active','suspended'\]/.test(files.membership)],
  ['membership required audit field is seeded', /addedBy:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /addedBy!?:\s*string/.test(files.membership)],
  ['plantation fixture includes required schema fields', /blockId:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /organizationId:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /location:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /areaAcres:\s*\{\s*type:\s*Number,\s*required:\s*true\s*\}/.test(files.seeder) && /createdBy:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /blockId!:\s*string/.test(files.plantation)],
  ['hive fixture includes required schema fields and allowed status', /hiveId:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /apiarySite:\s*\{\s*type:\s*String,\s*required:\s*true\s*\}/.test(files.seeder) && /colonyStatus:\s*\{\s*type:\s*String,\s*default:\s*'Unknown'\s*\}/.test(files.seeder) && /Occupied/.test(files.hive) && /colonyStatus:\s*'Occupied'/.test(files.seeder)],
  ['fixture seeder remains restricted to explicit test/QA database', /FORESTOS_TEST_MONGODB_URI/.test(files.seeder) && /test\|qa/i.test(files.seeder)],
  ['suspended membership user remains an active login account', /phase108\.suspended@example\.test/.test(files.seeder) && /status:\s*'suspended'/.test(files.seeder) && /active:\s*true/.test(files.seeder)],
];

let failed = 0;
for (const [label, condition] of checks) {
  try {
    assert.ok(condition, 'schema/fixture mismatch or expected contract not found');
    console.log(`PASS ${label}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${label}: ${error.message}`);
  }
}
console.log(`\nPhase 109 schema-alignment contract: ${checks.length - failed}/${checks.length} passed.`);
console.log('Scope: static source checks only; runtime model registration, collection mapping, login, and MongoDB behavior are not verified.');
if (failed) process.exitCode = 1;
