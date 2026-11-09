#!/usr/bin/env node
"use strict";
const assert=require("assert");
const {commitMongoBatch,createIndexDefinitions,ensureIndexes}=require("./phase154-mongodb-transactional-persistence-adapter");
let passed=0;function test(n,f){try{const r=f();if(r&&typeof r.then==="function")return r.then(()=>{passed++;console.log("PASS "+n)}).catch(e=>{console.error("FAIL "+n+": "+e.stack);process.exitCode=1});passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.stack);process.exitCode=1}}
function fixture(){
 const state={records:[],commits:[],revision:0,indexes:[]};
 const session={withTransaction:async fn=>fn(),endSession:async()=>{},tag:"session"};
 const connection={startSession:async()=>session};
 const q=(fn)=>({session:()=>({lean:async()=>fn()}),lean:async()=>fn()});
 const RecordModel={
   collection:{createIndex:async(keys,opts)=>state.indexes.push({keys,opts})},
   find:filter=>q(()=>state.records.filter(r=>r.tenantId===filter.tenantId).map(r=>({...r}))),
   deleteMany:async(filter)=>{state.records=state.records.filter(r=>r.tenantId!==filter.tenantId)},
   insertMany:async(rows)=>{state.records.push(...rows.map(r=>({...r})))}
 };
 const CommitModel={
   collection:{createIndex:async(keys,opts)=>state.indexes.push({keys,opts})},
   findOne:filter=>q(()=>filter.kind==="revision"?(state.revision?{revision:state.revision}:null):null),
   updateOne:async(filter,update,opts)=>{
     if(filter.kind==="revision"){state.revision=update.$set.revision;return}
     if(!state.commits.some(c=>c.tenantId===filter.tenantId&&c.commitId===filter.commitId))state.commits.push({...update.$setOnInsert});
   }
 };
 return {state,connection,RecordModel,CommitModel};
}
const rec={domain:"forestry",recordId:"plot-01",recordedAt:"2026-10-29",payload:{acres:7}};
const batch={batchId:"batch-01",now:"2026-10-29",incoming:[rec]};
(async()=>{
 await test("index plan enforces tenant/domain/record uniqueness",()=>{const d=createIndexDefinitions();assert.equal(d.records[0].options.unique,true);assert.deepEqual(d.records[0].keys,{tenantId:1,domain:1,recordId:1})});
 await test("index setup creates four indexes",async()=>{const f=fixture();const r=await ensureIndexes(f);assert.equal(r.created,4);assert.equal(f.state.indexes.length,4)});
 await test("tenant ID is mandatory",async()=>{const f=fixture();await assert.rejects(()=>commitMongoBatch({...f,tenantId:"",batch}),/tenantId is required/)});
 await test("missing Mongoose connection is rejected",async()=>{const f=fixture();await assert.rejects(()=>commitMongoBatch({tenantId:"farm-a",batch,RecordModel:f.RecordModel,CommitModel:f.CommitModel}),/startSession/)});
 await test("first batch commits and persists tenant-owned record",async()=>{const f=fixture();const r=await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.storeRevision,1);assert.equal(f.state.records.length,1);assert.equal(f.state.records[0].tenantId,"farm-a");assert.equal(f.state.revision,1)});
 await test("repeat identical batch is idempotent",async()=>{const f=fixture();await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});const r=await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.idempotent,true);assert.equal(r.storeRevision,1);assert.equal(f.state.records.length,1)});
 await test("stale expected revision is rejected",async()=>{const f=fixture();const r=await commitMongoBatch({...f,tenantId:"farm-a",batch,expectedRevision:3,now:"2026-10-29"});assert.equal(r.committed,false);assert.equal(r.reason,"revision_conflict");assert.equal(f.state.records.length,0)});
 await test("conflicted incoming batch is not persisted",async()=>{const f=fixture();await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});const before=JSON.stringify(f.state.records);const r=await commitMongoBatch({...f,tenantId:"farm-a",batch:{...batch,batchId:"batch-02",incoming:[{...rec,payload:{acres:8}}]},now:"2026-10-29"});assert.equal(r.committed,false);assert.equal(r.reason,"reconciliation_requires_review");assert.equal(JSON.stringify(f.state.records),before)});
 await test("tenant records are isolated during reconciliation",async()=>{const f=fixture();f.state.records.push({...rec,tenantId:"farm-b",version:1});const r=await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(f.state.records.filter(x=>x.tenantId==="farm-b").length,1)});
 await test("changed record uses transaction revision and version",async()=>{const f=fixture();await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});const changed={...rec,masterVersion:1,payload:{acres:8}};const r=await commitMongoBatch({...f,tenantId:"farm-a",batch:{...batch,batchId:"batch-02",incoming:[changed]},expectedRevision:1,now:"2026-10-29"});assert.equal(r.committed,true);assert.equal(r.storeRevision,2);assert.equal(f.state.records.find(x=>x.tenantId==="farm-a").version,2)});
 await test("commit ledger records batch and snapshot checksums",async()=>{const f=fixture();const r=await commitMongoBatch({...f,tenantId:"farm-a",batch,now:"2026-10-29"});assert.ok(r.commit.commitId);assert.ok(r.commit.batchHash);assert.ok(r.commit.masterSnapshotHash);assert.equal(f.state.commits.length,1)});
 console.log(`Phase 154 contract tests: ${passed}/11 passed`);if(passed!==11)process.exitCode=1;
})();
