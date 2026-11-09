#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'phase164-transaction-integrity-integration-tests.js'), 'utf8');
const checks = [
 ['requires explicit live-test write opt-in', src.includes("FORESTOS_TEST_ALLOW_WRITES !== 'YES'")],
 ['requires test-marked database name', src.includes('FORESTOS_TEST_DATABASE_NAME') && src.includes('test([_-]|$)')],
 ['checks URI database matches declared test database', src.includes('uriDbName !== dbName')],
 ['uses uniquely named collections', src.includes('phase164_records_') && src.includes('phase164_commits_')],
 ['checks rejected batch leaves no records', src.includes('rejected multi-record batch leaves records and revision unchanged')],
 ['checks revision unchanged after rejection', src.includes('countDocuments({ tenantId: tenant, kind: \'revision\' })'),],
 ['checks multi-record commit advances once', src.includes('valid batch atomically persists two records and advances revision once')],
 ['checks stale revision preservation', src.includes('stale revision rejection preserves records and revision')],
 ['checks version conflict preserves payload', src.includes('version conflict preserves original payload')],
 ['checks retry commit identity and revision', src.includes('identical retry preserves commit ID and revision')],
 ['cleans up only isolated test collections', src.includes('RecordModel.collection.drop()') && src.includes('CommitModel.collection.drop()')],
 ['requires compiled API service and mongoose', src.includes('registry-persistence.service.js') && src.includes('mongoose')],
 ['does not claim database tests ran without URI', src.includes('No database was modified.')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 164 contract tests: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
