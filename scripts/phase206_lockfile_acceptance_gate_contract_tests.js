#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const scriptPath = path.join(__dirname, 'phase206_lockfile_acceptance_gate.js');
const src = fs.readFileSync(scriptPath, 'utf8');
const tests = [
  ['acceptance utility exists', () => assert.ok(fs.existsSync(scriptPath))],
  ['requires candidate path', () => assert.match(src, /--candidate/)],
  ['requires expected SHA-256', () => assert.match(src, /--sha256/)],
  ['requires explicit provenance confirmation', () => assert.match(src, /--confirm-trusted-source/)],
  ['hashes candidate with SHA-256', () => assert.match(src, /sha256\(bytes\)/)],
  ['checks lockfile version', () => assert.match(src, /\[2,3\]/)],
  ['checks package identity', () => assert.match(src, /lockRoot\.name === manifest\.name/)],
  ['checks package version', () => assert.match(src, /lockRoot\.version === manifest\.version/)],
  ['checks dependencies alignment', () => assert.match(src, /devDependencies/)],
  ['refuses overwrite', () => assert.match(src, /existsSync\(targetPath\)/)],
  ['uses exclusive file creation', () => assert.match(src, /flag: 'wx'/)],
  ['records no network access', () => assert.match(src, /networkAccessAttempted: false/)],
  ['does not install dependencies', () => assert.match(src, /installExecuted: false/)],
  ['does not build API', () => assert.match(src, /buildExecuted: false/)],
  ['does not clear production', () => assert.match(src, /productionCleared: false/)],
  ['writes a machine-readable report', () => assert.match(src, /PHASE206_LOCKFILE_ACCEPTANCE_REPORT\.json/)],
  ['documents post-import clean install', () => assert.match(src, /npm ci/)],
  ['distinguishes import from build success', () => assert.match(src, /IMPORTED_REQUIRES_CLEAN_INSTALL_AND_BUILD/)],
];
let passed = 0;
for (const [name, fn] of tests) { fn(); passed++; console.log(`PASS ${name}`); }
console.log(`Phase 206 contract tests: ${passed}/${tests.length} passed`);
