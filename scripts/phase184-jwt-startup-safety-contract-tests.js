#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'apps/api/src/auth/jwt-secret-policy.js');
const policy = require(policyPath);
const authModule = fs.readFileSync(path.join(root, 'apps/api/src/auth/auth.module.ts'), 'utf8');
const report = JSON.parse(fs.readFileSync(path.join(root, 'PHASE184_JWT_STARTUP_SAFETY.json'), 'utf8'));
const checks = [
  ['missing JWT_SECRET fails closed', () => assert.throws(() => policy.resolveJwtSecret({ NODE_ENV: 'production' }), /must be configured/)],
  ['empty JWT_SECRET fails closed', () => assert.throws(() => policy.resolveJwtSecret({ NODE_ENV: 'development', JWT_SECRET: '  ' }), /must be configured/)],
  ['known placeholder secret is rejected', () => assert.throws(() => policy.resolveJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'change-me' }), /placeholder/)],
  ['short production secret is rejected', () => assert.throws(() => policy.resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'short-secret' }), /at least 32/)],
  ['repeated-character production secret is rejected', () => assert.throws(() => policy.resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'A'.repeat(40) }), /repeated-character/)],
  ['valid production secret is accepted', () => assert.equal(policy.resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'a-unique-production-secret-with-40-chars' }), 'a-unique-production-secret-with-40-chars')],
  ['valid development secret is accepted', () => assert.equal(policy.resolveJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'local-dev-secret' }), 'local-dev-secret')],
  ['auth module resolves secret before JWT registration', () => assert.match(authModule, /secret:resolveJwtSecret\(process\.env\)/)],
  ['no default signing secret is introduced', () => assert.doesNotMatch(authModule, /JWT_SECRET\s*\|\|\s*['"`]/)],
  ['policy report does not claim live verification', () => assert.equal(report.liveRuntimeTestsRun, false)],
  ['policy documents production minimum', () => assert.equal(report.productionMinimumCharacters, 32)],
  ['policy documents required environment variable', () => assert.equal(report.requiredEnvironmentVariable, 'JWT_SECRET')],
];
let failed = 0;
for (const [name, fn] of checks) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (err) { failed++; console.error(`FAIL ${name}: ${err.message}`); }
}
console.log(`\nPhase 184 contract tests: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
