#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/forestos-api-verified-build.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const pkgPath = path.join(root, 'apps/api/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const tests = [
  ['manual dispatch only', () => { assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m); }],
  ['explicit BUILD confirmation gates job', () => assert.match(workflow, /inputs\.confirm_build == 'BUILD'/)],
  ['read-only repository permission', () => assert.match(workflow, /permissions:\s*\n\s+contents: read/)],
  ['Node 20 is specified', () => assert.match(workflow, /node-version:\s*'20'/)],
  ['lockfile generation disables lifecycle scripts', () => assert.match(workflow, /npm install --package-lock-only --ignore-scripts/)],
  ['lockfile validation checks identity and dependencies', () => { assert.match(workflow, /lock\.name !== manifest\.name/); assert.match(workflow, /devDependencies/); }],
  ['clean installation uses npm ci with lifecycle scripts enabled', () => { assert.match(workflow, /run: npm ci --no-audit --no-fund/); assert.doesNotMatch(workflow, /npm ci --ignore-scripts/); }],
  ['actual API compilation uses npm run build', () => assert.match(workflow, /run: npm run build/)],
  ['execution steps have bounded timeouts', () => { assert.match(workflow, /timeout-minutes: 6/); assert.match(workflow, /timeout-minutes: 10/); }],
  ['evidence step runs even after failures', () => assert.match(workflow, /- name: Capture result and fingerprints\n        if: always\(\)/)],
  ['build evidence includes hashes and no production clearance', () => { assert.match(workflow, /manifestSha256/); assert.match(workflow, /lockfileSha256/); assert.match(workflow, /productionCleared: false/); }],
  ['artifact uploads even after failures', () => assert.match(workflow, /- name: Upload build evidence\n        if: always\(\)/)],
  ['does not push or commit changes', () => { assert.doesNotMatch(workflow, /git push|git commit/); assert.match(workflow, /contents: read/); }],
  ['API build script exists', () => assert.equal(pkg.scripts.build, 'nest build')],
  ['manifest has expected identity', () => { assert.equal(pkg.name, 'forestos-api'); assert.equal(pkg.version, '0.1.0'); }],
  ['workflow artifact includes package manifest', () => assert.match(workflow, /phase211-evidence\/package\.json/)],
  ['lockfile artifact is conditionally included', () => assert.match(workflow, /if \[ -f apps\/api\/package-lock\.json \]/)],
  ['registry and source commit are recorded', () => { assert.match(workflow, /npm config get registry/); assert.match(workflow, /git rev-parse HEAD/); }],
  ['network retry count is bounded', () => assert.match(workflow, /--fetch-retries=0 --fetch-timeout=30000/)],
  ['workflow warns build success is not production release', () => assert.match(workflow, /not a production release|not a production|productionCleared: false/)],
];
let passed = 0;
for (const [name, test] of tests) {
  try { test(); passed++; console.log(`PASS ${name}`); }
  catch (err) { console.error(`FAIL ${name}: ${err.stack}`); process.exitCode = 1; }
}
console.log(`Phase 210 contract assertions: ${passed}/${tests.length} passed`);
