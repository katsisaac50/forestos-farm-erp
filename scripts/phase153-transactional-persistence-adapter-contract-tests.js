#!/usr/bin/env node
"use strict";
const assert = require("assert"), fs = require("fs"), os = require("os"), path = require("path");
const {commitBatch,readStore,emptyStore} = require("./phase153-transactional-persistence-adapter");
let passed=0; function test(n,f){try{f();passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.stack);process.exitCode=1}}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"forestos153-")), store=path.join(dir,"master-store.json");
const record={domain:"forestry",recordId:"plot-001",recordedAt:"2026-10-29",payload:{acres:7,species:"eucalyptus"}};
const batch={batchId:"batch-001",now:"2026-10-29",incoming:[record]};
test("new store has schema and revision zero",()=>{assert.deepEqual(emptyStore().records,[]);assert.equal(readStore(store).revision,0)});
test("first valid batch commits atomically",()=>{let r=commitBatch({storePath:store,batch,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.storeRevision,1);assert.equal(readStore(store).records.length,1)});
test("identical retry is idempotent",()=>{let before=fs.readFileSync(store,"utf8");let r=commitBatch({storePath:store,batch,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.idempotent,true);assert.equal(r.storeRevision,1);assert.equal(readStore(store).revision,1)});
test("expected revision mismatch prevents write",()=>{let r=commitBatch({storePath:store,batch:{...batch,batchId:"batch-002",incoming:[{...record,recordId:"plot-002"}]},expectedRevision:0,now:"2026-10-29"});assert.equal(r.committed,false);assert.equal(r.reason,"revision_conflict");assert.equal(readStore(store).records.length,1)});
test("valid changed record increments version and store revision",()=>{let r=commitBatch({storePath:store,batch:{...batch,batchId:"batch-003",incoming:[{...record,masterVersion:1,payload:{acres:8,species:"eucalyptus"}}]},expectedRevision:1,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.storeRevision,2);assert.equal(readStore(store).records[0].version,2)});
test("conflicted batch does not mutate store",()=>{let before=fs.readFileSync(store,"utf8");let r=commitBatch({storePath:store,batch:{...batch,batchId:"batch-004",incoming:[{...record,payload:{acres:9}}]},now:"2026-10-29"});assert.equal(r.committed,false);assert.equal(r.reason,"reconciliation_requires_review");assert.equal(fs.readFileSync(store,"utf8"),before)});
test("malformed record is rejected from commit",()=>{let before=fs.readFileSync(store,"utf8");let r=commitBatch({storePath:store,batch:{...batch,batchId:"batch-005",incoming:[{domain:"forestry"}]},now:"2026-10-29"});assert.equal(r.committed,false);assert.equal(fs.readFileSync(store,"utf8"),before)});
test("store lock prevents competing writer",()=>{const lock=store+".lock";fs.mkdirSync(lock);try{assert.throws(()=>commitBatch({storePath:store,batch,lockTimeoutMs:30}),/locked by another writer/)}finally{fs.rmSync(lock,{recursive:true,force:true})}});
test("invalid store schema is not overwritten",()=>{const bad=path.join(dir,"bad.json");fs.writeFileSync(bad,JSON.stringify({records:"not-array"}));assert.throws(()=>commitBatch({storePath:bad,batch}),/invalid schema/);assert.equal(JSON.parse(fs.readFileSync(bad,"utf8")).records,"not-array")});
test("commit ledger is retained",()=>{const s=readStore(store);assert.ok(Array.isArray(s.commits));assert.ok(s.commits.length>=2);assert.ok(s.commits.every(c=>c.commitId&&c.batchHash&&c.masterSnapshotHash))});
fs.rmSync(dir,{recursive:true,force:true});
console.log(`Phase 153 contract tests: ${passed} passed`);if(passed!==10)process.exitCode=1;
