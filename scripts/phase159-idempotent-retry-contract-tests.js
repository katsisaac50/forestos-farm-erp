#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps/api/src/registry-persistence/registry-persistence.service.ts'), 'utf8');
const checks = [];
function check(name, condition) { checks.push({ name, passed: Boolean(condition) }); }
const hashAt = source.indexOf("const batchHash = hash({ batchId: batch.batchId, incoming: batch.incoming });");
const retryAt = source.indexOf("if (existingCommit)");
const revisionAt = source.indexOf("const revDoc = await this.commits.findOne({ tenantId, kind: 'revision' })");
check('Batch hash is calculated before revision lookup', hashAt >= 0 && hashAt < revisionAt);
check('Existing batch retry is resolved before revision lookup', retryAt >= 0 && retryAt < revisionAt);
check('Idempotent retry returns the original commit revision', source.includes('storeRevision: Number.isInteger(existingCommit.toRevision) ? existingCommit.toRevision : 0'));
check('Expected revision conflict remains for new batches', source.indexOf('batch.expectedRevision !== revision') > revisionAt);
check('Writes check optimistic match/upsert outcome', source.includes('writeResult.matchedCount === 0 && writeResult.upsertedCount === 0'));
check('Write conflict has explicit machine-readable code', source.includes("code: 'WRITE_VERSION_CONFLICT'"));
check('Tenant scope remains in record writes', /\{ tenantId, domain: doc\.domain, recordId: doc\.recordId/.test(source));
check('Transaction remains in use', source.includes('session.withTransaction(async () =>'));
for (const c of checks) console.log(`${c.passed ? 'PASS' : 'FAIL'} ${c.name}`);
console.log(`Phase 159 contract tests: ${checks.filter(c=>c.passed).length}/${checks.length} passed.`);
if (checks.some(c=>!c.passed)) process.exitCode = 1;
