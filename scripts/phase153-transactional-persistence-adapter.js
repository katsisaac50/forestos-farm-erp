#!/usr/bin/env node
"use strict";
/**
 * ForestOS Phase 153 — Transactional Persistence Adapter (file-backed prototype)
 * Uses an exclusive lock directory and atomic rename for a single local JSON store.
 * This is NOT a multi-host database and must not be used as a production datastore.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { reconcile } = require("./phase152-master-data-registry-idempotent-import");

function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function digest(v) { return crypto.createHash("sha256").update(canonical(v)).digest("hex"); }
function emptyStore() { return { schemaVersion: "1.0", revision: 0, records: [], commits: [] }; }
function readStore(storePath) {
  if (!fs.existsSync(storePath)) return emptyStore();
  const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
  if (!parsed || !Array.isArray(parsed.records) || !Array.isArray(parsed.commits) || !Number.isInteger(parsed.revision)) {
    throw new Error("Store file has an invalid schema; refusing to overwrite it");
  }
  return parsed;
}
function acquireLock(lockPath, options = {}) {
  const timeoutMs = options.timeoutMs ?? 1500;
  const pollMs = options.pollMs ?? 25;
  const start = Date.now();
  while (true) {
    try {
      fs.mkdirSync(lockPath);
      fs.writeFileSync(path.join(lockPath, "owner.json"), JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
      return () => { try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch (_) {} };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      if (Date.now() - start >= timeoutMs) throw new Error("Store is locked by another writer; retry later");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pollMs);
    }
  }
}
function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  const fd = fs.openSync(tmp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, content, "utf8");
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, filePath);
  try {
    const dirfd = fs.openSync(path.dirname(filePath), "r");
    try { fs.fsyncSync(dirfd); } finally { fs.closeSync(dirfd); }
  } catch (_) {}
}
function commitBatch({ storePath, batch, expectedRevision, now, lockTimeoutMs }) {
  if (!storePath) throw new Error("storePath is required");
  if (!batch || !Array.isArray(batch.incoming)) throw new Error("batch.incoming must be an array");
  const resolved = path.resolve(storePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const unlock = acquireLock(`${resolved}.lock`, { timeoutMs: lockTimeoutMs });
  try {
    const store = readStore(resolved);
    if (expectedRevision !== undefined && expectedRevision !== store.revision) {
      return { committed: false, reason: "revision_conflict", expectedRevision, actualRevision: store.revision, storeRevision: store.revision };
    }
    const report = reconcile({
      batchId: batch.batchId || "unspecified-batch",
      now: now || batch.now || new Date().toISOString().slice(0, 10),
      master: { records: store.records },
      incoming: batch.incoming
    });
    if (report.status !== "reconciled") {
      return { committed: false, reason: "reconciliation_requires_review", storeRevision: store.revision, report };
    }
    const newRecords = report.records;
    const changed = report.summary.created > 0 || report.summary.updated > 0;
    const nextRevision = changed ? store.revision + 1 : store.revision;
    const commit = {
      commitId: digest({ batchHash: report.batchHash, fromRevision: store.revision, toRevision: nextRevision }),
      batchId: report.batchId,
      batchHash: report.batchHash,
      committedAt: now || batch.now || new Date().toISOString().slice(0, 10),
      fromRevision: store.revision,
      toRevision: nextRevision,
      result: report.summary,
      masterSnapshotHash: report.masterSnapshotHash
    };
    const commits = store.commits.slice();
    if (!commits.some(c => c.commitId === commit.commitId)) commits.push(commit);
    const nextStore = { schemaVersion: "1.0", revision: nextRevision, records: newRecords, commits };
    if (changed || commits.length !== store.commits.length) {
      atomicWrite(resolved, JSON.stringify(nextStore, null, 2) + "\n");
    }
    return { committed: true, idempotent: !changed, storeRevision: nextRevision, commit, summary: report.summary, masterSnapshotHash: report.masterSnapshotHash };
  } finally { unlock(); }
}
function parseArgs(argv) { const o = {}; for (const a of argv) { const m = a.match(/^--([^=]+)=(.*)$/); if (m) o[m[1]] = m[2]; } return o; }
if (require.main === module) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.input || !a.store) {
    console.error("Usage: node scripts/phase153-transactional-persistence-adapter.js --input=FILE --store=FILE [--expected-revision=N] [--now=YYYY-MM-DD]");
    process.exit(2);
  }
  try {
    const batch = JSON.parse(fs.readFileSync(path.resolve(a.input), "utf8"));
    const result = commitBatch({ storePath: a.store, batch, expectedRevision: a["expected-revision"] === undefined ? undefined : Number(a["expected-revision"]), now: a.now });
    console.log(JSON.stringify(result, null, 2));
    if (!result.committed) process.exitCode = 1;
  } catch (err) { console.error(`Phase 153 failed: ${err.message}`); process.exit(2); }
}
module.exports = { emptyStore, readStore, acquireLock, atomicWrite, commitBatch, digest };
