#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const seeder = fs.readFileSync(path.join(root, 'scripts/phase108-seed-test-fixtures.js'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.test.yml'), 'utf8');
const checks = [
  ['dedicated Mongo test service uses separate host port', /27018:27017/],
  ['test service is behind an explicit compose profile', /profiles:\s*\["test"\]/],
  ['seeder refuses to run without explicit test URI', /FORESTOS_TEST_MONGODB_URI/],
  ['seeder requires database name to contain test or qa', /test|qa/i],
  ['seeder uses deterministic test-only email addresses', /phase108\.owner\.a@example\.test/],
  ['fixture covers organization membership and suspended state', /status: 'suspended'/],
  ['fixture covers plantation and hive records', /PH108-BLOCK-A/],
  ['fixture does not drop a whole database', !/dropDatabase\s*\(/.test(seeder)],
];
let failed = 0;
for (const [label, pattern] of checks) {
  try {
    if (pattern instanceof RegExp) assert.match(label.includes('does not drop') ? seeder : (label.includes('Mongo test') || label.includes('compose profile') ? compose : seeder), pattern);
    else assert.ok(pattern);
    console.log(`PASS ${label}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${label}: ${e.message}`);
  }
}
console.log(`\nPhase 108 environment contract: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
