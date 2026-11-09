#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/forestos-api-verified-build.yml'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const tests = [
  ['manual trigger only', () => { assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m); }],
  ['explicit BUILD confirmation', () => assert.match(workflow, /inputs\.confirm_build == 'BUILD'/)],
  ['least privilege repository permissions', () => assert.match(workflow, /permissions:\s*\n\s+contents: read/)],
  ['Node.js runtime is pinned to major 20', () => assert.match(workflow, /node-version:\s*'20'/)],
  ['no npm cache dependency on a missing lockfile', () => assert.doesNotMatch(workflow, /cache-dependency-path:|\n\s+cache: npm/)],
  ['lockfile generation is bounded and disables lifecycle scripts', () => { assert.match(workflow, /--package-lock-only --ignore-scripts/); assert.match(workflow, /--fetch-timeout=30000/); assert.match(workflow, /timeout-minutes: 6/); }],
  ['dependency maps compared order-independently', () => { assert.match(workflow, /Object\.entries\(value \|\| \{\}\)\.sort/); assert.match(workflow, /optionalDependencies/); }],
  ['clean install runs npm ci with lifecycle scripts enabled', () => { assert.match(workflow, /run: npm ci --no-audit --no-fund/); assert.doesNotMatch(workflow, /npm ci --ignore-scripts/); }],
  ['actual NestJS build runs', () => assert.match(workflow, /run: npm run build/)],
  ['install and build have bounded timeouts', () => { assert.match(workflow, /timeout-minutes: 10/); assert.match(workflow, /timeout-minutes: 6/); }],
  ['evidence collection runs after earlier failure', () => assert.match(workflow, /- name: Capture result and fingerprints\n        if: always\(\)/)],
  ['evidence warns dist alone is insufficient', () => assert.match(workflow, /dist alone does not prove this run compiled successfully/)],
  ['artifact upload runs after failure', () => assert.match(workflow, /- name: Upload build evidence\n        if: always\(\)/)],
  ['workflow never pushes or commits', () => assert.doesNotMatch(workflow, /git push|git commit/)],
  ['build script exists', () => assert.equal(pkg.scripts.build, 'nest build')],
  ['API identity is expected', () => { assert.equal(pkg.name, 'forestos-api'); assert.equal(pkg.version, '0.1.0'); }],
  ['workflow records source commit and fingerprints', () => { assert.match(workflow, /sourceCommit:/); assert.match(workflow, /manifestSha256:/); assert.match(workflow, /lockfileSha256:/); }],
  ['production remains explicitly uncleared', () => assert.match(workflow, /productionCleared: false/)],
];
let passed = 0;
for (const [name, test] of tests) { try { test(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
console.log(`Phase 211 contract assertions: ${passed}/${tests.length} passed`);
