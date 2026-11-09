#!/usr/bin/env node
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}
function hash(v) { return crypto.createHash("sha256").update(canonical(v)).digest("hex"); }
function isDate(v) { return typeof v === "string" && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v); }
function key(r) { return `${r.domain}:${r.recordId}`; }
function validateIncoming(r, index) {
  const errors = [];
  if (!r || typeof r !== "object" || Array.isArray(r)) return {index, errors:["record must be an object"]};
  if (typeof r.domain !== "string" || !r.domain.trim()) errors.push("domain is required");
  if (typeof r.recordId !== "string" || !r.recordId.trim()) errors.push("recordId is required");
  if (!isDate(r.recordedAt)) errors.push("recordedAt must be an ISO date or timestamp");
  if (!r.payload || typeof r.payload !== "object" || Array.isArray(r.payload)) errors.push("payload must be an object");
  if (r.masterVersion !== undefined && (!Number.isInteger(r.masterVersion) || r.masterVersion < 1)) errors.push("masterVersion must be a positive integer");
  if (r.operation !== undefined && !["upsert","create","update"].includes(r.operation)) errors.push("operation must be upsert, create, or update");
  return {index, errors};
}
function reconcile({batchId="unspecified-batch", now=new Date().toISOString().slice(0,10), master={records:[]}, incoming=[]}) {
  const staged = new Map();
  for (const r of (Array.isArray(master.records) ? master.records : [])) if (r && typeof r.domain==="string" && typeof r.recordId==="string" && !staged.has(key(r))) staged.set(key(r),r);
  const seen = new Set(), accepted=[], created=[], updated=[], unchanged=[], conflicts=[], quarantined=[];
  for (let i=0;i<incoming.length;i++) {
    const r=incoming[i], v=validateIncoming(r,i);
    if (v.errors.length) { quarantined.push({index:i,recordId:r&&r.recordId||null,errors:v.errors}); continue; }
    const k=key(r);
    if (seen.has(k)) { quarantined.push({index:i,recordId:r.recordId,key:k,errors:["duplicate key within incoming batch"]}); continue; }
    seen.add(k);
    const prior=staged.get(k), incomingHash=hash(r.payload);
    if (!prior) {
      if (r.operation==="update") { conflicts.push({key:k,recordId:r.recordId,reason:"update requested but master record does not exist",incomingIndex:i}); continue; }
      staged.set(k,{domain:r.domain,recordId:r.recordId,recordedAt:r.recordedAt,payload:r.payload,payloadHash:incomingHash,version:1,createdAt:now,updatedAt:now,lastBatchId:batchId});
      created.push(k); accepted.push({key:k,action:"created",version:1}); continue;
    }
    if ((prior.payloadHash || hash(prior.payload || {}))===incomingHash) { unchanged.push(k); accepted.push({key:k,action:"unchanged",version:prior.version||1}); continue; }
    const actual=Number.isInteger(prior.version)?prior.version:1;
    if (r.operation==="create") { conflicts.push({key:k,recordId:r.recordId,reason:"create requested but master record already exists",expectedVersion:r.masterVersion??null,actualVersion:actual,incomingIndex:i}); continue; }
    if (r.masterVersion===undefined) { conflicts.push({key:k,recordId:r.recordId,reason:"changed record requires masterVersion for optimistic concurrency",expectedVersion:null,actualVersion:actual,incomingIndex:i}); continue; }
    if (r.masterVersion!==actual) { conflicts.push({key:k,recordId:r.recordId,reason:"stale masterVersion; possible concurrent edit",expectedVersion:r.masterVersion,actualVersion:actual,incomingIndex:i}); continue; }
    staged.set(k,{domain:r.domain,recordId:r.recordId,recordedAt:r.recordedAt,payload:r.payload,payloadHash:incomingHash,version:actual+1,createdAt:prior.createdAt||now,updatedAt:now,lastBatchId:batchId});
    updated.push(k); accepted.push({key:k,action:"updated",version:actual+1});
  }
  const records=[...staged.values()].sort((a,b)=>key(a).localeCompare(key(b)));
  return {schemaVersion:"1.0",phase:152,batchId,generatedAt:now,status:conflicts.length||quarantined.length?"review_required":"reconciled",
    summary:{input:incoming.length,created:created.length,updated:updated.length,unchanged:unchanged.length,conflicts:conflicts.length,quarantined:quarantined.length,masterRecords:records.length},
    accepted,conflicts,quarantined,masterSnapshotHash:hash(records),batchHash:hash({batchId,incoming}),records};
}
function args(argv){const o={};for(const a of argv){const m=a.match(/^--([^=]+)=(.*)$/);if(m)o[m[1]]=m[2];}return o;}
if(require.main===module){const a=args(process.argv.slice(2));if(!a.input||!a.output){console.error("Usage: node scripts/phase152-master-data-registry-idempotent-import.js --input=FILE --output=FILE [--now=YYYY-MM-DD]");process.exit(2);}
try{const input=JSON.parse(fs.readFileSync(path.resolve(a.input),"utf8"));const report=reconcile({...input,now:a.now||input.now});fs.writeFileSync(path.resolve(a.output),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({output:path.resolve(a.output),status:report.status,summary:report.summary,masterSnapshotHash:report.masterSnapshotHash},null,2));process.exitCode=report.status==="review_required"?1:0;}catch(e){console.error(`Phase 152 failed: ${e.message}`);process.exit(2);}}
module.exports={canonical,hash,validateIncoming,reconcile};
