#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const script = fs.readFileSync(path.join(__dirname, 'phase167-recovery-idempotency-integration-tests.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '..', 'apps/api/src/registry-persistence/registry-persistence.service.ts'), 'utf8');
const checks = [
 ['requires explicit write opt-in and test database marker', script.includes("FORESTOS_TEST_ALLOW_WRITES !== 'YES'") && script.includes('test([_-]|$)')],
 ['requires exact URI/database-name match', script.includes('uriDbName !== dbName')],
 ['uses uniquely named Phase 167 collections', script.includes('phase167_records_') && script.includes('phase167_commits_')],
 ['injects storage-layer failure', script.includes("recordId: { $ne: 'force-db-reject' }")],
 ['asserts failed batch leaves records and ledger empty', script.includes('must-rollback') && script.includes("kind: 'batch' }), 0")],
 ['asserts failed batch leaves revision empty', script.includes("kind: 'revision' }), 0")],
 ['submits a separate valid recovery batch at revision zero', script.includes('phase167-recovery-') && script.includes('expectedRevision: 0')],
 ['asserts successful recovery reaches revision one', script.includes('first.storeRevision, 1')],
 ['replays exact recovery batch and asserts idempotency', script.includes('service.commit(tenant, recoveryBatch)') && script.includes('retry.idempotent, true')],
 ['asserts retry preserves commit identity and original revision', script.includes('retry.commit.commitId, first.commit.commitId') && script.includes('retry.storeRevision, first.storeRevision')],
 ['asserts retry does not duplicate records or batch ledger', script.includes('retry must not duplicate records') && script.includes('retry must not duplicate ledger')],
 ['asserts retry does not advance stored revision', script.includes('retry must not advance revision')],
 ['cleans up only generated collections', script.includes('RecordModel.collection.drop()') && script.includes('CommitModel.collection.drop()')],
 ['service resolves idempotent retry before revision conflict check', service.indexOf('const existingCommit') < service.indexOf('if (batch.expectedRevision')],
 ['skips safely without prerequisites', script.includes('No database was modified.')],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`Phase 167 recovery/idempotency contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed) process.exitCode=1;
