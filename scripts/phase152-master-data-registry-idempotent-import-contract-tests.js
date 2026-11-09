#!/usr/bin/env node
"use strict";
const assert=require("assert"),{reconcile,hash,validateIncoming}=require("./phase152-master-data-registry-idempotent-import");
let passed=0;function test(n,f){try{f();passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.message);process.exitCode=1}}
const b={domain:"forestry",recordId:"plot-01",recordedAt:"2026-10-29",payload:{acres:7,species:"eucalyptus"}};
const m={domain:"forestry",recordId:"plot-01",recordedAt:"2026-10-01",payload:{acres:6,species:"eucalyptus"},payloadHash:hash({acres:6,species:"eucalyptus"}),version:2,createdAt:"2026-01-01",updatedAt:"2026-10-01"};
test("creates version 1",()=>{let r=reconcile({now:"2026-10-29",incoming:[b]});assert.equal(r.summary.created,1);assert.equal(r.records[0].version,1)});
test("identical re-import is idempotent",()=>{let a=reconcile({now:"2026-10-29",incoming:[b]});let r=reconcile({now:"2026-10-29",master:{records:a.records},incoming:[b]});assert.equal(r.summary.created,0);assert.equal(r.summary.unchanged,1);assert.equal(r.records[0].version,1)});
test("matching version updates",()=>{let r=reconcile({now:"2026-10-29",master:{records:[m]},incoming:[{...b,masterVersion:2}]});assert.equal(r.summary.updated,1);assert.equal(r.records[0].version,3)});
test("changed record without version conflicts",()=>{let r=reconcile({now:"2026-10-29",master:{records:[m]},incoming:[b]});assert.equal(r.summary.conflicts,1)});
test("stale version conflicts",()=>{let r=reconcile({now:"2026-10-29",master:{records:[m]},incoming:[{...b,masterVersion:1}]});assert.equal(r.summary.conflicts,1)});
test("create existing conflicts",()=>{let r=reconcile({now:"2026-10-29",master:{records:[m]},incoming:[{...b,operation:"create"}]});assert.equal(r.summary.conflicts,1)});
test("update missing record conflicts",()=>{let r=reconcile({now:"2026-10-29",incoming:[{...b,operation:"update"}]});assert.equal(r.summary.conflicts,1)});
test("invalid record quarantined while valid proceeds",()=>{let r=reconcile({now:"2026-10-29",incoming:[{domain:"x"},{...b,recordId:"plot-02"}]});assert.equal(r.summary.quarantined,1);assert.equal(r.summary.created,1)});
test("duplicate key quarantines second",()=>{let r=reconcile({now:"2026-10-29",incoming:[b,{...b,payload:{acres:99}}]});assert.equal(r.summary.created,1);assert.equal(r.summary.quarantined,1)});
test("same ID in different domains permitted",()=>{let r=reconcile({now:"2026-10-29",incoming:[b,{...b,domain:"apiary"}]});assert.equal(r.summary.created,2)});
test("hash ignores key order",()=>assert.equal(hash({a:1,b:2}),hash({b:2,a:1})));
test("hash changes with payload",()=>assert.notEqual(hash({a:1}),hash({a:2})));
test("bad date rejected",()=>assert.ok(validateIncoming({...b,recordedAt:"yesterday"},0).errors.length));
test("snapshot ordering deterministic",()=>{let a=reconcile({now:"2026-10-29",incoming:[b,{...b,domain:"apiary"}]});let c=reconcile({now:"2026-10-29",incoming:[{...b,domain:"apiary"},b]});assert.equal(a.masterSnapshotHash,c.masterSnapshotHash)});
test("unchanged record preserves version",()=>{let r=reconcile({now:"2026-10-29",master:{records:[m]},incoming:[{...m}]});assert.equal(r.summary.unchanged,1);assert.equal(r.records[0].version,2)});
test("batch checksum deterministic",()=>{let a=reconcile({batchId:"b1",now:"2026-10-29",incoming:[b]}),c=reconcile({batchId:"b1",now:"2026-10-29",incoming:[b]});assert.equal(a.batchHash,c.batchHash)});
console.log(`Phase 152 contract tests: ${passed} passed`);if(passed!==16)process.exitCode=1;
