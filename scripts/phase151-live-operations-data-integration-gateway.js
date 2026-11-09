#!/usr/bin/env node
"use strict";
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const ALLOWED_DOMAINS=new Set(["forestry","apiary","workforce","inspections","dataQuality","correctiveActions","decisionActions"]);
const ALLOWED_PRIORITIES=new Set(["critical","high","medium","low","info"]);
function err(msg){const e=new Error(msg);e.name="ValidationError";throw e;}
function date(value,label){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))err(`${label} must be YYYY-MM-DD`);
 const d=new Date(value+"T00:00:00.000Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)err(`${label} is not a valid calendar date`);
 return value;
}
function canonical(v){if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";return JSON.stringify(v);}
function digest(v){return crypto.createHash("sha256").update(canonical(v)).digest("hex");}
function object(v,label){if(!v||typeof v!=="object"||Array.isArray(v))err(`${label} must be an object`);return v;}
function arr(v,label){if(v===undefined)return [];if(!Array.isArray(v))err(`${label} must be an array`);return v;}
function cleanText(v,label,max=240){if(typeof v!=="string"||!v.trim())err(`${label} must be a non-empty string`);if(v.trim().length>max)err(`${label} exceeds ${max} characters`);return v.trim();}
function validateRecord(record,domain,index,now){
 object(record,`${domain}.records[${index}]`);
 const id=cleanText(record.recordId||record.id,`${domain}.records[${index}].recordId`,120);
 const recordedAt=date(record.recordedAt,`${domain}.records[${index}].recordedAt`);
 if(recordedAt>now)err(`${domain} record ${id}: recordedAt cannot be after the gateway run date`);
 const status=record.status===undefined?"received":cleanText(record.status,`${domain}.records[${index}].status`,60);
 const priority=record.priority===undefined?"medium":cleanText(record.priority,`${domain}.records[${index}].priority`,20).toLowerCase();
 if(!ALLOWED_PRIORITIES.has(priority))err(`${domain} record ${id}: priority must be critical, high, medium, low, or info`);
 const payload=record.payload===undefined?{}:object(record.payload,`${domain}.records[${index}].payload`);
 const payloadHash=digest(payload);
 const suppliedHash=record.payloadHash;
 if(suppliedHash!==undefined && (typeof suppliedHash!=="string"||suppliedHash!==payloadHash))err(`${domain} record ${id}: payloadHash mismatch`);
 return {
  domain,recordId:id,recordedAt,status,priority,
  source:typeof record.source==="string"&&record.source.trim()?record.source.trim():"manual_import",
  payload,payloadHash,contentHash:digest({domain,recordId:id,recordedAt,status,priority,source:record.source||"manual_import",payload}),
  validation:"accepted"
 };
}
function buildBatch(input,options={}){
 object(input,"input");
 const now=date(options.now||input.generatedAt,"now/generatedAt");
 const sourceBatchId=cleanText(input.batchId||("BATCH-"+digest(input).slice(0,12)), "batchId",120);
 const feed=input.feeds;
 object(feed,"feeds");
 const receivedAt=date(input.receivedAt||now,"receivedAt");
 if(receivedAt>now)err("receivedAt cannot be after the gateway run date");
 const feeds={},accepted=[],quarantine=[],warnings=[];
 let receivedCount=0;
 for(const domain of Object.keys(feed)){
  if(!ALLOWED_DOMAINS.has(domain)) {warnings.push({code:"UNKNOWN_DOMAIN",domain,message:"Feed domain is not in the supported ForestOS domain list; no records imported."});continue;}
  const records=arr(feed[domain],`feeds.${domain}`);
  feeds[domain]={received:records.length,accepted:0,quarantined:0,duplicateWithinBatch:0};
  receivedCount+=records.length;
  const seen=new Set();
  for(let i=0;i<records.length;i++){
   try{
    const item=validateRecord(records[i],domain,i,now);
    const key=domain+":"+item.recordId;
    if(seen.has(key)){feeds[domain].duplicateWithinBatch++;quarantine.push({domain,recordId:item.recordId,code:"DUPLICATE_RECORD_ID",message:"Duplicate record ID within this batch; later occurrence quarantined."});feeds[domain].quarantined++;continue;}
    seen.add(key);accepted.push(item);feeds[domain].accepted++;
   }catch(e){
    quarantine.push({domain,index:i,recordId:records[i]&&(records[i].recordId||records[i].id)||null,code:"INVALID_RECORD",message:e.message});
    feeds[domain].quarantined++;
   }
  }
 }
 const batchCore={schemaVersion:"151.1",batchId:sourceBatchId,generatedAt:now,receivedAt,feeds,accepted,quarantine,warnings};
 const batchHash=digest(batchCore);
 const lineage={
  batchId:sourceBatchId,receivedAt,generatedAt:now,
  sourceSnapshotHash:digest(input),acceptedRecordsHash:digest(accepted),
  quarantineHash:digest(quarantine),batchHash,
  hashing:"SHA-256 over canonicalized JSON; integrity checksum only, not a digital signature"
 };
 return {
  schemaVersion:"151.1",gateway:"live_operations_data_integration_gateway",
  batchId:sourceBatchId,generatedAt:now,receivedAt,
  status:quarantine.length===0&&warnings.length===0?"accepted":accepted.length===0&&warnings.length===0?"rejected":"accepted_with_warnings",
  summary:{domainsReceived:Object.keys(feeds).length,recordsReceived:receivedCount,recordsAccepted:accepted.length,recordsQuarantined:quarantine.length,duplicateWithinBatch:Object.values(feeds).reduce((n,x)=>n+x.duplicateWithinBatch,0),unknownDomains:warnings.length},
  feeds,acceptedRecords:accepted,quarantine,warnings,lineage,
  nextStep:"Review quarantined records, reconcile IDs against the master system, then pass accepted records to a separately controlled persistence/integration adapter.",
  productionBoundary:{liveConnectors:false,databaseWrites:false,authentication:false,authorization:false,concurrencyControl:false,immutableAuditLog:false,externalDelivery:false,operatorReviewRequired:true}
 };
}
function main(argv){
 const args={};
 for(const a of argv){const m=a.match(/^--([^=]+)=(.*)$/);if(!m)err(`Invalid argument "${a}". Use --input=FILE --output=FILE [--now=YYYY-MM-DD]`);args[m[1]]=m[2];}
 if(!args.input||!args.output)err("Required arguments: --input=FILE --output=FILE [--now=YYYY-MM-DD]");
 const input=JSON.parse(fs.readFileSync(path.resolve(args.input),"utf8"));
 const result=buildBatch(input,{now:args.now});
 fs.writeFileSync(path.resolve(args.output),JSON.stringify(result,null,2)+"\n");
 console.log(JSON.stringify({ok:true,output:path.resolve(args.output),status:result.status,accepted:result.summary.recordsAccepted,quarantined:result.summary.recordsQuarantined,batchHash:result.lineage.batchHash}));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error("ForestOS Phase 151 error: "+e.message);process.exitCode=1;}}
module.exports={buildBatch,digest,canonical,date,ALLOWED_DOMAINS};
