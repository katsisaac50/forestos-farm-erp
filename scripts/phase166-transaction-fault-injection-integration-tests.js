#!/usr/bin/env node
'use strict';
// Opt-in live transaction rollback test. Uses only uniquely named collections in a disposable test DB.
const assert = require('assert');
const crypto = require('crypto');
async function main() {
  const uri = process.env.FORESTOS_TEST_MONGODB_URI;
  const dbName = process.env.FORESTOS_TEST_DATABASE_NAME || '';
  if (!uri || !/(^|[_-])test([_-]|$)/i.test(dbName) || process.env.FORESTOS_TEST_ALLOW_WRITES !== 'YES') {
    console.log('SKIP: configure a disposable test database, matching URI/database name, and FORESTOS_TEST_ALLOW_WRITES=YES.');
    console.log('No database was modified.'); return;
  }
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('FORESTOS_TEST_MONGODB_URI must be a valid MongoDB URI.'); }
  const uriDbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (uriDbName !== dbName) throw new Error('URI database name must exactly match FORESTOS_TEST_DATABASE_NAME.');
  let mongoose;
  try { mongoose = require('../apps/api/node_modules/mongoose'); }
  catch { try { mongoose = require('mongoose'); } catch { throw new Error('Install API dependencies first; mongoose is required.'); } }
  let recordMod, commitMod, serviceMod;
  try {
    recordMod = require('../apps/api/dist/registry-persistence/registry-record.schema.js');
    commitMod = require('../apps/api/dist/registry-persistence/registry-commit.schema.js');
    serviceMod = require('../apps/api/dist/registry-persistence/registry-persistence.service.js');
  } catch { throw new Error('Build the API first: cd apps/api && npm install && npm run build'); }
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise();
  const suffix = crypto.randomBytes(6).toString('hex');
  const recordsName = `phase166_records_${suffix}`;
  const commitsName = `phase166_commits_${suffix}`;
  const RecordModel = conn.model(`Phase166Record_${suffix}`, recordMod.RegistryRecordSchema, recordsName);
  const CommitModel = conn.model(`Phase166Commit_${suffix}`, commitMod.RegistryCommitSchema, commitsName);
  const service = new serviceMod.RegistryPersistenceService(conn, RecordModel, CommitModel);
  const tenant = `phase166-tenant-${suffix}`;
  let createdRecords = false, createdCommits = false;
  try {
    // MongoDB rejects the second record at the storage layer, after the service has attempted
    // the first write. That failure should abort the transaction, including the first write.
    await conn.db.createCollection(recordsName, { validator: { recordId: { $ne: 'force-db-reject' } }, validationLevel: 'strict', validationAction: 'error' });
    createdRecords = true;
    await conn.db.createCollection(commitsName);
    createdCommits = true;
    await RecordModel.createIndexes(); await CommitModel.createIndexes();
    const batch = {
      batchId: `phase166-rollback-${suffix}`, expectedRevision: 0,
      incoming: [
        { domain: 'forestry', recordId: 'first-write-should-rollback', recordedAt: '2026-10-29', payload: { acres: 1 } },
        { domain: 'forestry', recordId: 'force-db-reject', recordedAt: '2026-10-29', payload: { acres: 2 } },
      ],
    };
    await assert.rejects(() => service.commit(tenant, batch), undefined, 'database validator should reject second write');
    assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 0, 'first write must be rolled back');
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'batch' }), 0, 'batch ledger must remain unchanged');
    assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'revision' }), 0, 'revision must remain unchanged');
    console.log('PASS storage-layer rejection aborts the whole transaction');
    console.log('PASS no partial records, batch commit, or revision remain');
    console.log('Phase 166 live rollback test: 2/2 passed');
  } finally {
    if (createdRecords) await RecordModel.collection.drop().catch(() => {});
    if (createdCommits) await CommitModel.collection.drop().catch(() => {});
    await conn.close();
  }
}
main().catch(err => { console.error(`FAIL: ${err.message}`); process.exitCode = 1; });
