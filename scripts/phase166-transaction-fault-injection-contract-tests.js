#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');
const script = fs.readFileSync(path.join(__dirname, 'phase166-transaction-fault-injection-integration-tests.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '..', 'apps/api/src/registry-persistence/registry-persistence.service.ts'), 'utf8');
const checks = [
 ['requires explicit write opt-in and standalone test database marker', script.includes("FORESTOS_TEST_ALLOW_WRITES !== 'YES'") && script.includes('test([_-]|$)')],
 ['requires exact URI/database-name match', script.includes('uriDbName !== dbName')],
 ['uses unique Phase 166 collections', script.includes('phase166_records_') && script.includes('phase166_commits_')],
 ['injects failure at the MongoDB storage validator', script.includes("recordId: { $ne: 'force-db-reject' }")],
 ['first write precedes the intentionally rejected second write', script.includes("incoming: [\n        { domain: 'forestry', recordId: 'first-write-should-rollback'") && script.includes("recordId: 'force-db-reject'")],
 ['asserts rejected batch leaves no tenant records', script.includes('countDocuments({ tenantId: tenant }), 0')],
 ['asserts no batch ledger entry remains', script.includes("kind: 'batch' }), 0")],
 ['asserts no revision entry remains', script.includes("kind: 'revision' }), 0")],
 ['cleans up only the two generated collections', script.includes('RecordModel.collection.drop()') && script.includes('CommitModel.collection.drop()')],
 ['service uses MongoDB transaction wrapper', service.includes('session.withTransaction')],
 ['skips without prerequisites and says no DB was modified', script.includes('No database was modified.')],
];
let failed=0; for (const [name,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
console.log(`Phase 166 fault-injection contract tests: ${checks.length-failed}/${checks.length} passed`); if(failed) process.exitCode=1;
