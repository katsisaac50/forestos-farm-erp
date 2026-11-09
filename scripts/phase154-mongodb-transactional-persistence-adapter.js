#!/usr/bin/env node
"use strict";
/**
 * ForestOS Phase 154 — MongoDB transactional persistence adapter.
 * Uses injected Mongoose-compatible models so contract tests can run without a live DB.
 * Production calls require MongoDB replica-set/sharded-cluster transaction support.
 */
const crypto = require("crypto");
const { reconcile } = require("./phase152-master-data-registry-idempotent-import");

function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function digest(v) { return crypto.createHash("sha256").update(canonical(v)).digest("hex"); }

function assertTenantId(tenantId) {
  if (typeof tenantId !== "string" || !tenantId.trim()) throw new Error("tenantId is required");
}
function createIndexDefinitions() {
  return {
    records: [
      { keys: { tenantId: 1, domain: 1, recordId: 1 }, options: { unique: true, name: "tenant_domain_record_unique" } },
      { keys: { tenantId: 1, updatedAt: -1 }, options: { name: "tenant_updated_at" } }
    ],
    commits: [
      { keys: { tenantId: 1, commitId: 1 }, options: { unique: true, name: "tenant_commit_unique" } },
      { keys: { tenantId: 1, batchHash: 1 }, options: { name: "tenant_batch_hash" } }
    ]
  };
}
async function ensureIndexes({ RecordModel, CommitModel }) {
  if (!RecordModel || !CommitModel) throw new Error("RecordModel and CommitModel are required");
  const indexes = createIndexDefinitions();
  for (const item of indexes.records) await RecordModel.collection.createIndex(item.keys, item.options);
  for (const item of indexes.commits) await CommitModel.collection.createIndex(item.keys, item.options);
  return { created: 4, definitions: indexes };
}
async function commitMongoBatch({ connection, RecordModel, CommitModel, tenantId, batch, expectedRevision, now }) {
  assertTenantId(tenantId);
  if (!connection || typeof connection.startSession !== "function") throw new Error("Mongoose connection with startSession() is required");
  if (!RecordModel || !CommitModel) throw new Error("RecordModel and CommitModel are required");
  if (!batch || !Array.isArray(batch.incoming)) throw new Error("batch.incoming must be an array");
  const session = await connection.startSession();
  let outcome;
  try {
    await session.withTransaction(async () => {
      const revisionDoc = await CommitModel.findOne({ tenantId, kind: "revision" }).session(session).lean();
      const currentRevision = revisionDoc && Number.isInteger(revisionDoc.revision) ? revisionDoc.revision : 0;
      if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
        outcome = { committed: false, reason: "revision_conflict", expectedRevision, actualRevision: currentRevision };
        return;
      }
      const stored = await RecordModel.find({ tenantId }).session(session).lean();
      const report = reconcile({
        batchId: batch.batchId || "unspecified-batch",
        now: now || batch.now || new Date().toISOString().slice(0,10),
        master: { records: stored.map(({ tenantId: _tenant, _id, __v, ...r }) => r) },
        incoming: batch.incoming
      });
      if (report.status !== "reconciled") {
        outcome = { committed: false, reason: "reconciliation_requires_review", storeRevision: currentRevision, report };
        return;
      }
      const changed = report.summary.created > 0 || report.summary.updated > 0;
      const nextRevision = changed ? currentRevision + 1 : currentRevision;
      if (changed) {
        // Transaction protects delete/reinsert replacement from partial visibility.
        await RecordModel.deleteMany({ tenantId }, { session });
        if (report.records.length) {
          await RecordModel.insertMany(report.records.map(r => ({ ...r, tenantId })), { session, ordered: true });
        }
      }
      const commitId = digest({ tenantId, batchHash: report.batchHash, fromRevision: currentRevision, toRevision: nextRevision });
      const commit = {
        tenantId, commitId, kind: "batch", batchId: report.batchId, batchHash: report.batchHash,
        committedAt: now || batch.now || new Date().toISOString().slice(0,10),
        fromRevision: currentRevision, toRevision: nextRevision,
        result: report.summary, masterSnapshotHash: report.masterSnapshotHash
      };
      await CommitModel.updateOne({ tenantId, commitId }, { $setOnInsert: commit }, { upsert: true, session });
      if (changed) {
        await CommitModel.updateOne({ tenantId, kind: "revision" }, { $set: { revision: nextRevision, updatedAt: commit.committedAt }, $setOnInsert: { tenantId, kind: "revision" } }, { upsert: true, session });
      }
      outcome = { committed: true, idempotent: !changed, tenantId, storeRevision: nextRevision, commit, summary: report.summary, masterSnapshotHash: report.masterSnapshotHash };
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}
module.exports = { createIndexDefinitions, ensureIndexes, commitMongoBatch, digest, assertTenantId };
