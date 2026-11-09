#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/forestos-api-lockfile-recovery.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const tests = [
  ['workflow exists', () => assert.ok(fs.existsSync(workflowPath))],
  ['workflow is manual only', () => assert.match(workflow, /workflow_dispatch:/)],
  ['generation requires explicit confirmation', () => assert.match(workflow, /confirm_generation == 'GENERATE'/)],
  ['repository permissions are read-only', () => assert.match(workflow, /contents: read/)],
  ['checks out selected commit', () => assert.match(workflow, /actions\/checkout@v4/)],
  ['pins Node major version', () => assert.match(workflow, /node-version: '20'/)],
  ['lockfile generation is explicit', () => assert.match(workflow, /npm install --package-lock-only/)],
  ['generation disables lifecycle scripts', () => assert.match(workflow, /--ignore-scripts/)],
  ['registry retries are disabled', () => assert.match(workflow, /--fetch-retries=0/)],
  ['network request has a timeout', () => assert.match(workflow, /--fetch-timeout=30000/)],
  ['job has a bounded timeout', () => assert.match(workflow, /timeout-minutes: 10/)],
  ['validates lockfile JSON and root metadata', () => assert.match(workflow, /packages\[''\]/)],
  ['validates lockfile version', () => assert.match(workflow, /lockfileVersion !== 2/)],
  ['validates package identity', () => assert.match(workflow, /lock\.name !== manifest\.name/)],
  ['validates root dependency maps', () => assert.match(workflow, /Root \$\{key\} mismatch/)],
  ['captures manifest fingerprint', () => assert.match(workflow, /manifestSha256/)],
  ['captures lockfile fingerprint', () => assert.match(workflow, /lockfileSha256/)],
  ['captures source commit and registry', () => assert.match(workflow, /git rev-parse HEAD/) && assert.match(workflow, /npm config get registry/)],
  ['uploads artifact with provenance', () => assert.match(workflow, /actions\/upload-artifact@v4/) && assert.match(workflow, /PHASE208_CI_LOCKFILE_PROVENANCE\.json/)],
  ['does not commit lockfile back automatically', () => assert.doesNotMatch(workflow, /git push|git commit/)],
  ['API manifest identity is known', () => assert.equal(manifest.name, 'forestos-api')],
  ['production clearance is not granted by workflow', () => assert.match(workflow, /must review this run/)],
];
let passed = 0;
for (const [name, fn] of tests) { fn(); passed++; console.log(`PASS ${name}`); }
console.log(`Phase 208 contract assertions: ${passed}/${tests.length} passed`);
