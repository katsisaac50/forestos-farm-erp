#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 112 — model/fixture contract audit.
 * Dependency-free static checks; this does not connect to MongoDB or prove
 * that the app's registered Mongoose models behave correctly at runtime.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

const access = read('apps/api/src/organizations/organization-access.service.ts');
const membership = read('apps/api/src/organizations/organization-membership.schema.ts');
const organization = read('apps/api/src/organizations/organization.schema.ts');
const orgModule = read('apps/api/src/organizations/organizations.module.ts');
const seeder = read('scripts/phase108-seed-test-fixtures.js');
const packageJson = JSON.parse(read('apps/api/package.json'));
const workflow = read('.github/workflows/tenant-security-regression.yml');

const checks = [
  ['Organization schema is registered in OrganizationsModule',
    /name:\s*Organization\.name,\s*schema:\s*OrganizationSchema/.test(orgModule)],
  ['Membership schema is registered in OrganizationsModule',
    /name:\s*OrganizationMembership\.name,\s*schema:\s*OrganizationMembershipSchema/.test(orgModule)],
  ['membership schema requires string userId and organizationId',
    /userId!:\s*string/.test(membership) && /organizationId!:\s*string/.test(membership)],
  ['membership unique index is scoped to user and organization',
    /index\(\{userId:1,organizationId:1\},\{unique:true\}\)/.test(membership)],
  ['active membership lookup uses string reference values',
    /userId:\s*String\(userId\)/.test(access) && /organizationId:\s*String\(requestedOrganizationId\)/.test(access)],
  ['organization document lookup uses ObjectId conversion for _id',
    /_id:\s*new Types\.ObjectId\(requestedOrganizationId\)/.test(access)],
  ['fixture seeder explicitly names the organizations collection',
    seeder.includes("mongoose.model('Organization'") && /'organizations'/.test(seeder)],
  ['fixture seeder explicitly names the users collection',
    seeder.includes("mongoose.model('User'") && /'users'/.test(seeder)],
  ['fixture seeder explicitly names the membership collection',
    seeder.includes("mongoose.model('OrganizationMembership'") && /'organizationmemberships'/.test(seeder)],
  ['seeder is protected by test/qa database-name guard',
    /Database name must include "test" or "qa"/.test(seeder)],
  ['API package does not claim an unconfigured test runner',
    !packageJson.scripts?.test || /phase112|jest|vitest|mocha/.test(packageJson.scripts.test)],
  ['tenant regression workflow invokes this audit',
    /phase112-model-fixture-contract-tests\.js/.test(workflow)],
];
let failed = 0;
for (const [label, condition] of checks) {
  try { assert.ok(condition, 'contract not found'); console.log(`PASS ${label}`); }
  catch (error) { failed++; console.error(`FAIL ${label}: ${error.message}`); }
}
console.log(`\nPhase 112 model/fixture contract audit: ${checks.length - failed}/${checks.length} passed.`);
console.log('Scope: static checks only. Confirm collection names and schema compatibility against a disposable MongoDB test database before live tenant tests.');
if (failed) process.exitCode = 1;
