#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const script = fs.readFileSync(path.join(__dirname, 'phase165-concurrency-recovery-integration-tests.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '..', 'apps/api/src/registry-persistence/registry-persistence.service.ts'), 'utf8');
const checks = [
 ['requires explicit opt-in before live database writes', script.includes("FORESTOS_TEST_ALLOW_WRITES !== 'YES'")],
 ['requires a test-marked database and exact URI database match', script.includes('test([_-]|$)') && script.includes('uriDbName !== dbName')],
 ['uses isolated Phase 165 collection names', script.includes('phase165_records_') && script.includes('phase165_commits_')],
 ['runs two competing writes at the same expected revision', script.includes("service.commit(tenant, make('concurrent-left', 1") && script.includes("service.commit(tenant, make('concurrent-right', 1")],
 ['asserts exactly one competing write succeeds', script.includes('assert.equal(fulfilled.length, 1') && script.includes('assert.equal(rejected.length, 1')],
 ['asserts only one revision increment under contention', script.includes('assert.equal(rev.revision, 2)')],
 ['asserts only one competing record is persisted', script.includes('assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 3)')],
 ['uses Promise.allSettled to observe both outcomes', script.includes('Promise.allSettled')],
 ['service uses transaction wrapper for commit work', service.includes('session.withTransaction')],
 ['service performs conditional version-matched writes', service.includes('WRITE_VERSION_CONFLICT') && service.includes('doc.version - 1')],
 ['cleans up only its own generated collections', script.includes('RecordModel.collection.drop()') && script.includes('CommitModel.collection.drop()')],
 ['does not claim live tests ran when prerequisites are absent', script.includes('No database was modified.')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 165 concurrency/recovery contract tests: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
