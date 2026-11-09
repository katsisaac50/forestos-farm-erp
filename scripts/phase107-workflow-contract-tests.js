#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/tenant-security-regression.yml'), 'utf8');
const checks = [
  ['pull request trigger is configured', /pull_request:/],
  ['push trigger is configured', /push:/],
  ['Node 20 is pinned for the job', /node-version: "20"/],
  ['Phase 105 contract tests run in CI', /node scripts\/phase105-tenant-contract-tests\.js/],
  ['Phase 108 environment contract tests run in CI', /node scripts\/phase108-environment-contract-tests\.js/],
  ['Phase 104 membership regression runs in CI', /node scripts\/phase104-membership-tenant-regression\.js/],
  ['Phase 103 security regression runs in CI', /node scripts\/phase103-security-regression\.js/],
  ['live job is opt-in by repository variable', /vars\.FORESTOS_LIVE_TENANT_TESTS_ENABLED == 'true'/],
  ['live HTTP harness is invoked', /node scripts\/phase106-live-tenant-http-tests\.js/],
  ['audit artifact upload is configured', /actions\/upload-artifact@v4/],
];
let failed = 0;
for (const [label, pattern] of checks) {
  try {
    assert.match(workflow, pattern);
    console.log(`PASS ${label}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${label}: ${e.message}`);
  }
}
console.log(`\nPhase 107 workflow contract: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
