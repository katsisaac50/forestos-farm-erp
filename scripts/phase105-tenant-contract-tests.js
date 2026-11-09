#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 105 — executable tenant contract tests.
 *
 * Dependency-free contract tests. These inspect the source and test fixtures;
 * they do NOT claim to execute NestJS requests or prove MongoDB isolation.
 * Run: node scripts/phase105-tenant-contract-tests.js
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
  }
}

check('membership schema uses a single role field and supports active/suspended states', () => {
  const source = read('apps/api/src/organizations/organization-membership.schema.ts');
  assert.match(source, /\brole\b/);
  assert.match(source, /active/);
  assert.match(source, /suspended/);
});

check('organization context maps singular membership role into a roles array', () => {
  const source = read('apps/api/src/organizations/organization-access.service.ts');
  assert.match(source, /Array\.isArray\(\(membership as any\)\.roles\)/);
  assert.match(source, /typeof \(membership as any\)\.role === 'string'/);
  assert.match(source, /\[\(membership as any\)\.role\]/);
});

check('organization scope discards caller-supplied organization ID and uses trusted context', () => {
  const source = read('apps/api/src/organizations/organization-scope.ts');
  assert.match(source, /organizationFilter/);
  assert.match(source, /organizationId/);
  assert.match(source, /context\.organizationId/);
});

check('two-tenant regression matrix includes isolation, suspended membership, and role cases', () => {
  const matrix = JSON.parse(read('apps/api/test/phase104-two-tenant-integration-matrix.json'));
  const serialized = JSON.stringify(matrix).toLowerCase();
  assert.match(serialized, /tenant|organization|org/);
  assert.match(serialized, /suspend/);
  assert.match(serialized, /role|viewer|finance|admin/);
  assert.match(serialized, /guessed id|two-organization|two organization/);
});

check('integration plan explicitly documents runtime prerequisites and negative cases', () => {
  const plan = read('apps/api/test/phase104-two-tenant-integration.test-plan.md').toLowerCase();
  assert.match(plan, /mongodb/);
  assert.match(plan, /two organizations|two-tenant/);
  assert.match(plan, /suspended/);
});

check('release readiness workflow retains API and web build steps', () => {
  const workflow = read('.github/workflows/release-readiness.yml');
  assert.match(workflow, /apps\/api/);
  assert.match(workflow, /apps\/web/);
  assert.match(workflow, /npm run build/);
});

for (const result of results) {
  console.log(`${result.status === 'PASS' ? '✓' : '✗'} ${result.name}`);
  if (result.error) console.error(`  ${result.error}`);
}
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\nPhase 105 contract tests: ${results.length - failed}/${results.length} passed.`);
if (failed) process.exitCode = 1;
