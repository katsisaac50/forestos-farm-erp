#!/usr/bin/env node
'use strict';
// Opt-in live recovery test: injected storage failure, valid recovery commit, exact retry.
const assert = require('assert');
const crypto = require('crypto');
async function main() {
  const uri = process.env.FORESTOS_TEST_MONGODB_URI;
  const dbName = process.env.FORESTOS_TEST_DATABASE_NAME || '';
  if (!uri || !/(^|[_-])test([_-]|$)/i.test(dbName) || process.env.FORESTOS_TEST_ALLOW_WRITES !== 'YES') {
    console.log('SKIP: configure a disposable test database, matching URI/database name, and FORESTOS_TEST_ALLOW_WRITES=YES.');
    console.log('No database was modified.'); return;
  }
  let parsed; try { parsed = new URL(uri); } catch { throw new Error('FORESTOS_TEST_MONGODB_URI must be a valid MongoDB URI.'); }
  const uriDbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (uriDbName !== dbName) throw new Error('URI database name must exactly match FORESTOS_TEST_DATABASE_NAME.');
  let mongoose; try { mongoose = require('../apps/api/node_modules/mongoose'); } catch { try { mongoose = require('mongoose'); } catch { throw new Error('Install API dependencies first; mongoose is required.'); } }
  let recordMod, commitMod, serviceMod;
  try {
    recordMod = require('../apps/api/dist/registry-persistence/registry-record.schema.js');
    commitMod = require('../apps/api/dist/registry-persistence/registry-commit.schema.js');
    serviceMod = require('../apps/api/dist/registry-persistence/registry-persistence.service.js');
  } catch { throw new Error('Build the API first: cd apps/api && npm install && npm run build'); }
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise();
  const suffix = crypto.randomBytes(6).toString('hex');
  const recordsName = `phase167_records_${suffix}`, commitsName = `phase167_commits_${suffix}`;
  const RecordModel = conn.model(`Phase167Record_${suffix}`, recordMod.RegistryRecordSchema, recordsName);
  const CommitModel = conn.model(`Phase167Commit_${suffix}`, commitMod.RegistryCommitSchema, commitsName);
  const service = new serviceMod.RegistryPersistenceService(conn, RecordModel, CommitModel);
  const tenant = `phase167-tenant-${suffix}`;
  let createdRecords = false, createdCommits = false;
  try {
    await conn.db.createCollection(recordsName, { validator: { recordId: { $ne: 'force-db-reject' } }, validationLevel: 'strict', validationAction: 'error' }); createdRecords = true;
    await conn.db.createCollection(commitsName); createdCommits = true;
    await RecordModel.createIndexes(); await CommitModel.createIndexes();
    const failedBatch = { batchId: `phase167-failure-${suffix}`, expectedRevision: 0, incoming: [
      { domain: 'forestry', recordId: 'must-rollback', recordedAt: '2026-10-29', payload: { acres: 1 } },
      { domain: 'forestry', recordId: 'force-db-reject', recordedAt: '2026-10-29', payload: { acres: 2 } },
    ] };
    await assert.rejects(() => service.commit(tenant, failedBatch), undefined, 'injected storage rejection should abort batch');
    assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 0);
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'batch' }), 0);
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'revision' }), 0);
    console.log('PASS failed batch leaves no records, batch ledger, or revision');

    const recoveryBatch = { batchId: `phase167-recovery-${suffix}`, expectedRevision: 0, incoming: [
      { domain: 'forestry', recordId: 'recovered-record-a', recordedAt: '2026-10-29', payload: { acres: 3 } },
      { domain: 'forestry', recordId: 'recovered-record-b', recordedAt: '2026-10-29', payload: { acres: 4 } },
    ] };
    const first = await service.commit(tenant, recoveryBatch);
    assert.equal(first.committed, true); assert.equal(first.idempotent, false); assert.equal(first.storeRevision, 1);
    assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 2);
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'batch' }), 1);
    const retry = await service.commit(tenant, recoveryBatch);
    assert.equal(retry.committed, true); assert.equal(retry.idempotent, true);
    assert.equal(retry.commit.commitId, first.commit.commitId, 'retry must return same commit identity');
    assert.equal(retry.storeRevision, first.storeRevision, 'retry must return original commit revision');
    assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 2, 'retry must not duplicate records');
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'batch' }), 1, 'retry must not duplicate ledger');
    const rev = await CommitModel.findOne({ tenantId: tenant, kind: 'revision' }).lean();
    assert.equal(rev.revision, 1, 'retry must not advance revision');
    console.log('PASS valid batch recovers cleanly at revision 1');
    console.log('PASS exact retry preserves commit ID, record count, ledger count, and revision');
    console.log('Phase 167 live recovery/idempotency test: 3/3 passed');
  } finally {
    if (createdRecords) await RecordModel.collection.drop().catch(() => {});
    if (createdCommits) await CommitModel.collection.drop().catch(() => {});
    await conn.close();
  }
}
main().catch(err => { console.error(`FAIL: ${err.message}`); process.exitCode = 1; });
