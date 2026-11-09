#!/usr/bin/env node
/**
 * Phase 104 regression guard for membership role normalization and two-tenant test contract.
 * Static checks only; actual MongoDB integration tests remain a separate release gate.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [
  ['membership schema defines canonical singular role', /role!\s*:\s*string/.test(read('apps/api/src/organizations/organization-membership.schema.ts'))],
  ['organization context normalizes legacy role arrays and canonical singular role', /Array\.isArray\(\(membership as any\)\.roles\)/.test(read('apps/api/src/organizations/organization-access.service.ts')) && /\[\(membership as any\)\.role\]/.test(read('apps/api/src/organizations/organization-access.service.ts'))],
  ['membership status must be active', /status:\s*'active'/.test(read('apps/api/src/organizations/organization-access.service.ts'))],
  ['trusted organization scope helper overrides user-supplied organizationId', /return\s+\{\s*\.\.\.safeFilters,\s*organizationId:\s*context\.organizationId\s*\}/.test(read('apps/api/src/organizations/organization-scope.ts'))],
  ['two-tenant integration matrix is present', fs.existsSync(path.join(root, 'apps/api/test/phase104-two-tenant-integration-matrix.json'))],
];
let fail = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) fail = true;
}
console.log('\nScope: static regression checks only; no MongoDB requests are executed.');
console.log(fail ? 'Result: FAIL' : 'Result: PASS');
process.exitCode = fail ? 1 : 0;
