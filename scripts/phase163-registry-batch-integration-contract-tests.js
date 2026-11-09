#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase163-registry-batch-integration-probe.js'), 'utf8');
const checks = [
  ['requires explicit write opt-in', src.includes("FORESTOS_TEST_ALLOW_WRITES !== 'YES'")],
  ['requires test-named database', src.includes('FORESTOS_TEST_DATABASE_NAME') && src.includes('test([_-]|$)')],
  ['uses registry persistence endpoint by default', src.includes("'/api/registry-persistence/batches'")],
  ['sends authenticated POST', src.includes("method: 'POST'") && src.includes('authorization: `Bearer ${token}`')],
  ['creates unique probe record', src.includes('crypto.randomUUID()')],
  ['checks tenant in initial response', src.includes('first.data?.tenantId === tenantId')],
  ['checks idempotent replay', src.includes('replay.data?.idempotent === true')],
  ['checks original commit identity', src.includes("replay.data?.commit?.commitId === first.data?.commit?.commitId")],
  ['does not print tokens or response bodies', !src.includes('console.log(token)') && !src.includes('console.log(JSON.stringify(first.data)')],
  ['writes machine-readable report', src.includes('PHASE163_REGISTRY_BATCH_INTEGRATION_REPORT.json')],
  ['documents scope limitations', src.includes('does not replace a full transaction')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 163 contract tests: ${checks.length - failed}/${checks.length} passed`); if (failed) process.exitCode = 1;
