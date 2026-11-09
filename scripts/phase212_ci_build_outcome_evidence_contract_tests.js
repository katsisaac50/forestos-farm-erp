#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/forestos-api-verified-build.yml'), 'utf8');
const tests = [
  ['workflow remains manually triggered', () => { assert.match(workflow, /workflow_dispatch:/); assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m); }],
  ['manual confirmation remains required', () => assert.match(workflow, /inputs\.confirm_build == 'BUILD'/)],
  ['least privilege permissions remain', () => assert.match(workflow, /contents: read/)],
  ['lockfile step has stable identifier', () => assert.match(workflow, /name: Generate lockfile in CI if absent\n        id: lockfile/)],
  ['install step has stable identifier', () => assert.match(workflow, /name: Clean dependency installation\n        id: install/)],
  ['build step has stable identifier', () => assert.match(workflow, /name: Compile NestJS API\n        id: build/)],
  ['lockfile generation disables lifecycle scripts', () => assert.match(workflow, /--package-lock-only --ignore-scripts/)],
  ['clean install uses npm ci', () => assert.match(workflow, /run: npm ci --no-audit --no-fund/)],
  ['actual NestJS build command is retained', () => assert.match(workflow, /run: npm run build/)],
  ['evidence collection runs even after failures', () => assert.match(workflow, /name: Capture result and fingerprints\n        if: always\(\)/)],
  ['evidence captures lockfile step outcome', () => assert.match(workflow, /lockfileStepOutcome: '\$\{\{ steps\.lockfile\.outcome \}\}'/)],
  ['evidence captures install step outcome', () => assert.match(workflow, /installStepOutcome: '\$\{\{ steps\.install\.outcome \}\}'/)],
  ['evidence captures build step outcome', () => assert.match(workflow, /buildStepOutcome: '\$\{\{ steps\.build\.outcome \}\}'/)],
  ['success requires all prerequisite steps to succeed', () => assert.match(workflow, /apiBuildSucceeded: '\$\{\{ steps\.build\.outcome \}\}' === 'success' && '\$\{\{ steps\.install\.outcome \}\}' === 'success' && '\$\{\{ steps\.lockfile\.outcome \}\}' === 'success'/)],
  ['evidence explicitly keeps production uncleared', () => assert.match(workflow, /productionCleared: false/)],
  ['phase 212 evidence file is used', () => assert.match(workflow, /PHASE212_BUILD_EVIDENCE\.json/)],
  ['phase 212 artifact is uploaded after failure', () => assert.match(workflow, /name: Upload build evidence\n        if: always\(\)/)],
  ['workflow does not push or commit', () => assert.doesNotMatch(workflow, /git push|git commit/)],
];
let passed = 0;
for (const [name, test] of tests) { try { test(); passed++; console.log(`PASS ${name}`); } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; } }
console.log(`Phase 212 contract assertions: ${passed}/${tests.length} passed`);
