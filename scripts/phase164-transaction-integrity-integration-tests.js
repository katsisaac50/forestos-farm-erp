#!/usr/bin/env node
'use strict';
// Opt-in live integration tests. Uses uniquely named collections and drops only those collections.
const assert = require('assert');
const crypto = require('crypto');

async function main() {
  const uri = process.env.FORESTOS_TEST_MONGODB_URI;
  const dbName = process.env.FORESTOS_TEST_DATABASE_NAME || '';
  if (!uri || !/(^|[_-])test([_-]|$)/i.test(dbName) || process.env.FORESTOS_TEST_ALLOW_WRITES !== 'YES') {
    console.log('SKIP: set FORESTOS_TEST_MONGODB_URI, FORESTOS_TEST_DATABASE_NAME with standalone test marker, and FORESTOS_TEST_ALLOW_WRITES=YES.');
    console.log('No database was modified.');
    return;
  }
  let parsedUri;
  try { parsedUri = new URL(uri); } catch { throw new Error('FORESTOS_TEST_MONGODB_URI must be a valid MongoDB URI.'); }
  const uriDbName = decodeURIComponent(parsedUri.pathname.replace(/^\//, ''));
  if (uriDbName !== dbName) throw new Error('Database name in FORESTOS_TEST_MONGODB_URI must exactly match FORESTOS_TEST_DATABASE_NAME.');
  let mongoose;
  try { mongoose = require('../apps/api/node_modules/mongoose'); }
  catch { try { mongoose = require('mongoose'); } catch { throw new Error('Install API dependencies first (mongoose is required).'); } }
  let recordMod, commitMod, serviceMod;
  try {
    recordMod = require('../apps/api/dist/registry-persistence/registry-record.schema.js');
    commitMod = require('../apps/api/dist/registry-persistence/registry-commit.schema.js');
    serviceMod = require('../apps/api/dist/registry-persistence/registry-persistence.service.js');
  } catch { throw new Error('Build the API first with `cd apps/api && npm install && npm run build`.'); }

  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise();
  const suffix = crypto.randomBytes(6).toString('hex');
  const recordsName = `phase164_records_${suffix}`;
  const commitsName = `phase164_commits_${suffix}`;
  const RecordModel = conn.model(`Phase164Record_${suffix}`, recordMod.RegistryRecordSchema, recordsName);
  const CommitModel = conn.model(`Phase164Commit_${suffix}`, commitMod.RegistryCommitSchema, commitsName);
  const service = new serviceMod.RegistryPersistenceService(conn, RecordModel, CommitModel);
  const tenant = `phase164-tenant-${suffix}`;
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  const make = (batchId, expectedRevision, incoming) => ({ batchId, expectedRevision, incoming });
  const rec = (recordId, payload, extra = {}) => ({ domain: 'forestry', recordId, recordedAt: '2026-10-29', payload, ...extra });
  try {
    await RecordModel.createCollection(); await CommitModel.createCollection();
    await RecordModel.createIndexes(); await CommitModel.createIndexes();
    await check('rejected multi-record batch leaves records and revision unchanged', async () => {
      const invalid = make('rollback-preflight', 0, [rec('plot-would-be-created', { acres: 1 }), rec('missing-plot', { acres: 2 }, { operation: 'update', masterVersion: 1 })]);
      await assert.rejects(() => service.commit(tenant, invalid));
      assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 0);
      assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'batch' }), 0);
      assert.equal(await CommitModel.countDocuments({ tenantId: tenant, kind: 'revision' }), 0);
    });
    await check('valid batch atomically persists two records and advances revision once', async () => {
      const r = await service.commit(tenant, make('two-record-batch', 0, [rec('plot-1', { acres: 2 }), rec('plot-2', { acres: 3 })]));
      assert.equal(r.committed, true); assert.equal(r.storeRevision, 1);
      assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 2);
      const rev = await CommitModel.findOne({ tenantId: tenant, kind: 'revision' }).lean(); assert.equal(rev.revision, 1);
    });
    await check('stale revision rejection preserves records and revision', async () => {
      await assert.rejects(() => service.commit(tenant, make('stale-batch', 0, [rec('plot-3', { acres: 4 })])));
      assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 2);
      const rev = await CommitModel.findOne({ tenantId: tenant, kind: 'revision' }).lean(); assert.equal(rev.revision, 1);
    });
    await check('version conflict preserves original payload', async () => {
      await assert.rejects(() => service.commit(tenant, make('bad-version', 1, [rec('plot-1', { acres: 99 }, { operation: 'update', masterVersion: 7 })])));
      const stored = await RecordModel.findOne({ tenantId: tenant, recordId: 'plot-1' }).lean(); assert.equal(stored.payload.acres, 2); assert.equal(stored.version, 1);
      const rev = await CommitModel.findOne({ tenantId: tenant, kind: 'revision' }).lean(); assert.equal(rev.revision, 1);
    });
    await check('identical retry preserves commit ID and revision', async () => {
      const batch = make('two-record-batch', 0, [rec('plot-1', { acres: 2 }), rec('plot-2', { acres: 3 })]);
      const first = await service.commit(tenant, batch); const retry = await service.commit(tenant, batch);
      assert.equal(retry.idempotent, true); assert.equal(retry.commit.commitId, first.commit.commitId); assert.equal(retry.storeRevision, first.storeRevision);
      assert.equal(await RecordModel.countDocuments({ tenantId: tenant }), 2);
    });
    console.log(`Phase 164 live transaction-integrity tests: ${passed}/5 passed`);
  } finally {
    await RecordModel.collection.drop().catch(() => {});
    await CommitModel.collection.drop().catch(() => {});
    await conn.close();
  }
}
main().catch(e => { console.error('FAIL', e.stack || e); process.exitCode = 1; });
