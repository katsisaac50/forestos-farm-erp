#!/usr/bin/env node
'use strict';
// Phase 124: validate an explicit, human-approved ownership manifest against an export.
// Dry-run only. No MongoDB connection and no writes.
function buildPlan(data, approvals){
 if(!data || !Array.isArray(data.salesOrders) || !Array.isArray(data.inventoryItems)) throw new Error('Export must contain salesOrders and inventoryItems arrays');
 if(!approvals || !Array.isArray(approvals.approvals)) throw new Error('Approval file must contain approvals array');
 const rows=[]; for(const [domain,key] of [['sales','salesOrders'],['inventory','inventoryItems']]) for(const row of data[key]) rows.push({domain,row});
 const byKey=new Map(rows.map(x=>[x.domain+'::'+String(x.row._id??''),x]));
 const seen=new Set(), actions=[], blockers=[];
 for(const a of approvals.approvals){
  const key=String(a.domain||'')+'::'+String(a.recordId||'');
  if(seen.has(key)){blockers.push({key,reason:'DUPLICATE_APPROVAL'});continue;} seen.add(key);
  const found=byKey.get(key); if(!found){blockers.push({key,reason:'RECORD_NOT_FOUND_IN_EXPORT'});continue;}
  const org=String(a.organizationId||'').trim();
  if(!/^[a-fA-F0-9]{24}$/.test(org)){blockers.push({key,reason:'INVALID_APPROVED_ORGANIZATION_ID'});continue;}
  if(typeof a.approvedBy!=='string'||!a.approvedBy.trim()||typeof a.evidenceRef!=='string'||!a.evidenceRef.trim()) {blockers.push({key,reason:'MISSING_APPROVER_OR_EVIDENCE_REFERENCE'});continue;}
  const existing=String(found.row.organizationId||'').trim();
  if(existing && existing.toLowerCase()!==org.toLowerCase()){blockers.push({key,reason:'EXISTING_ORGANIZATION_CONFLICT'});continue;}
  if(existing){actions.push({domain:found.domain,recordId:String(found.row._id),action:'NO_OP_ALREADY_MATCHES_APPROVAL',organizationId:org.toLowerCase(),approvedBy:a.approvedBy.trim(),evidenceRef:a.evidenceRef.trim()});}
  else actions.push({domain:found.domain,recordId:String(found.row._id),action:'PROPOSE_BACKFILL_ONLY',organizationId:org.toLowerCase(),approvedBy:a.approvedBy.trim(),evidenceRef:a.evidenceRef.trim()});
 }
 const uncovered=rows.filter(x=>!seen.has(x.domain+'::'+String(x.row._id??''))).map(x=>({domain:x.domain,recordId:String(x.row._id??''),reason:'NO_EXPLICIT_APPROVAL'}));
 return {phase:124,mode:'DRY_RUN_ONLY',databaseConnection:false,mutationsPerformed:false,productionReady:false,summary:{exportRecords:rows.length,approvalEntries:approvals.approvals.length,proposedBackfills:actions.filter(x=>x.action==='PROPOSE_BACKFILL_ONLY').length,noOps:actions.filter(x=>x.action==='NO_OP_ALREADY_MATCHES_APPROVAL').length,blocked: blockers.length,uncovered:uncovered.length},actions,blockers,uncovered,warnings:['This is a plan only; it never writes to MongoDB.','Approval identity and evidenceRef must be independently verified by an authorized reviewer.','Do not apply a backfill until backups, schema/index inspection, duplicate resolution, and non-production rehearsal are complete.']};
}
if(require.main===module){try{const [exportPath,approvalPath]=process.argv.slice(2);if(!exportPath||!approvalPath){console.error('Usage: node phase124-approved-tenant-migration-dry-run.js <export.json> <approved-mapping.json>');process.exit(2);}const fs=require('fs');const result=buildPlan(JSON.parse(fs.readFileSync(exportPath,'utf8')),JSON.parse(fs.readFileSync(approvalPath,'utf8')));console.log(JSON.stringify(result,null,2));if(result.blockers.length||result.uncovered.length)process.exitCode=3;}catch(e){console.error('Phase 124 dry-run failed: '+e.message);process.exit(1);}}
module.exports={buildPlan};
