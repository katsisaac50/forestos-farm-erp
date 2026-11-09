#!/usr/bin/env node
"use strict";
const assert = require("assert");
const crypto = require("crypto");

async function main() {
  const uri = process.env.FORESTOS_TEST_MONGODB_URI;
  if (!uri) {
    console.log("SKIP: set FORESTOS_TEST_MONGODB_URI to a disposable MongoDB replica-set URI.");
    console.log("No database was modified.");
    return;
  }
  let mongoose;
  try { mongoose = require("../apps/api/node_modules/mongoose"); }
  catch { try { mongoose = require("mongoose"); } catch { throw new Error("Install apps/api dependencies first (mongoose is required)."); } }

  const dist = "../apps/api/dist/registry-persistence";
  let recordMod, commitMod, serviceMod;
  try {
    recordMod = require(`${dist}/registry-record.schema.js`);
    commitMod = require(`${dist}/registry-commit.schema.js`);
    serviceMod = require(`${dist}/registry-persistence.service.js`);
  } catch {
    throw new Error("Build the API first with `cd apps/api && npm install && npm run build`.");
  }

  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise();
  const suffix = crypto.randomBytes(5).toString("hex");
  const RecordModel = conn.model(`Phase156Record_${suffix}`, recordMod.RegistryRecordSchema, `phase156_records_${suffix}`);
  const CommitModel = conn.model(`Phase156Commit_${suffix}`, commitMod.RegistryCommitSchema, `phase156_commits_${suffix}`);
  const service = new serviceMod.RegistryPersistenceService(conn, RecordModel, CommitModel);
  let passed = 0;
  const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
  const tenantA = `phase156-a-${suffix}`, tenantB = `phase156-b-${suffix}`;
  const batch = (batchId, expectedRevision, value) => ({
    batchId, expectedRevision,
    incoming: [{ domain:"forestry", recordId:"plot-01", recordedAt:"2026-10-29", payload:{ acres:value, species:"eucalyptus" } }]
  });

  try {
    await RecordModel.createCollection(); await CommitModel.createCollection();
    await RecordModel.createIndexes(); await CommitModel.createIndexes();

    await check("first batch commits and advances revision", async () => {
      const r = await service.commit(tenantA, batch("batch-1", 0, 7));
      assert.equal(r.committed, true); assert.equal(r.storeRevision, 1);
    });
    await check("identical retry is idempotent", async () => {
      const r = await service.commit(tenantA, batch("batch-1", 1, 7));
      assert.equal(r.idempotent, true);
      assert.equal(await RecordModel.countDocuments({tenantId:tenantA}), 1);
    });
    await check("tenant boundary keeps records isolated", async () => {
      assert.equal(await RecordModel.countDocuments({tenantId:tenantB}), 0);
      const r = await service.commit(tenantB, batch("batch-1", 0, 3));
      assert.equal(r.storeRevision, 1);
      assert.equal(await RecordModel.countDocuments({tenantId:tenantA}), 1);
    });
    await check("stale expected revision is rejected", async () => {
      await assert.rejects(() => service.commit(tenantA, batch("batch-stale", 0, 8)), e => e && (e.status === 409 || e.statusCode === 409));
    });
    await check("record version mismatch is rejected", async () => {
      const update = {batchId:"batch-update-bad",expectedRevision:1,incoming:[{domain:"forestry",recordId:"plot-01",recordedAt:"2026-10-29",payload:{acres:8,species:"eucalyptus"},masterVersion:9,operation:"update"}]};
      await assert.rejects(() => service.commit(tenantA, update), e => e && (e.status === 409 || e.statusCode === 409));
      const stored = await RecordModel.findOne({tenantId:tenantA,recordId:"plot-01"}).lean();
      assert.equal(stored.payload.acres, 7);
    });
    await check("concurrent stale writers cannot both commit", async () => {
      const updateBatch = (batchId, acres) => ({
        batchId, expectedRevision: 1,
        incoming: [{domain:"forestry",recordId:"plot-01",recordedAt:"2026-10-29",payload:{acres,species:"eucalyptus"},masterVersion:1,operation:"update"}]
      });
      const outcomes = await Promise.allSettled([
        service.commit(tenantA, updateBatch("concurrent-a", 8)),
        service.commit(tenantA, updateBatch("concurrent-b", 9))
      ]);
      const successes = outcomes.filter(x => x.status === "fulfilled");
      assert.equal(successes.length, 1, JSON.stringify(outcomes.map(x => x.status === "rejected" ? String(x.reason) : "fulfilled")));
      const stored = await RecordModel.findOne({tenantId:tenantA,recordId:"plot-01"}).lean();
      assert.ok([8,9].includes(stored.payload.acres));
      assert.equal(stored.version, 2);
      const rev = await CommitModel.findOne({tenantId:tenantA,kind:"revision"}).lean();
      assert.equal(rev.revision, 2);
    });
    await check("invalid batch does not persist records", async () => {
      await assert.rejects(() => service.commit(tenantA, {batchId:"bad",incoming:[{domain:"",recordId:"x",recordedAt:"bad",payload:{}}]}));
      assert.equal(await RecordModel.countDocuments({tenantId:tenantA}), 1);
    });
    console.log(`Phase 156 MongoDB integration tests: ${passed}/7 passed`);
  } finally {
    await RecordModel.collection.drop().catch(()=>{});
    await CommitModel.collection.drop().catch(()=>{});
    await conn.close();
  }
}
main().catch(e => { console.error("FAIL", e.stack || e); process.exitCode = 1; });
