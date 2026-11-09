#!/usr/bin/env node
'use strict';
// Phase 128 preflight. Default mode is offline/read-only. Optional --live-indexes
// performs read-only listIndexes() calls only when explicitly requested.
const fs = require('fs');
const path = require('path');

function validObjectId(v) { return /^[a-fA-F0-9]{24}$/.test(String(v || '').trim()); }
function key(row) { return String(row && row._id != null ? row._id : '').trim(); }

function buildReport(data, approvals) {
  if (!data || !Array.isArray(data.stockItems) || !Array.isArray(data.stockMovements)) {
    throw new Error('Export must contain stockItems and stockMovements arrays');
  }
  if (!approvals || !Array.isArray(approvals.approvals)) {
    throw new Error('Ownership manifest must contain approvals array');
  }
  const items = data.stockItems;
  const movements = data.stockMovements;
  const itemById = new Map();
  const duplicateIds = [];
  for (const item of items) {
    const id = key(item);
    if (!id) { duplicateIds.push({recordType:'stockItem', reason:'MISSING_RECORD_ID'}); continue; }
    if (itemById.has(id)) duplicateIds.push({recordType:'stockItem', recordId:id, reason:'DUPLICATE_RECORD_ID'});
    else itemById.set(id, item);
  }
  const approvalMap = new Map();
  const blockers = [];
  for (const a of approvals.approvals) {
    const id = String(a.recordId || '').trim();
    if (!['stockItem','stockMovement'].includes(a.recordType) || !id) {
      blockers.push({recordType:a.recordType || '', recordId:id, reason:'INVALID_RECORD_TYPE_OR_ID'}); continue;
    }
    const k = `${a.recordType}::${id}`;
    if (approvalMap.has(k)) { blockers.push({key:k, reason:'DUPLICATE_APPROVAL'}); continue; }
    approvalMap.set(k, a);
  }
  const actions = [];
  const seenCodes = new Map();
  for (const item of items) {
    const id = key(item);
    const a = approvalMap.get(`stockItem::${id}`);
    const existing = String(item.organizationId || '').trim();
    if (!a) blockers.push({recordType:'stockItem',recordId:id,reason:'NO_EXPLICIT_OWNERSHIP_APPROVAL'});
    else if (!validObjectId(a.organizationId) || !String(a.approvedBy||'').trim() || !String(a.evidenceRef||'').trim()) {
      blockers.push({recordType:'stockItem',recordId:id,reason:'INVALID_OR_INCOMPLETE_APPROVAL'});
    } else if (existing && existing.toLowerCase() !== String(a.organizationId).toLowerCase()) {
      blockers.push({recordType:'stockItem',recordId:id,reason:'EXISTING_ORGANIZATION_CONFLICT'});
    } else {
      actions.push({recordType:'stockItem',recordId:id,action:existing?'NO_OP_ALREADY_MATCHES_APPROVAL':'PROPOSE_BACKFILL_ONLY',organizationId:String(a.organizationId).toLowerCase(),approvedBy:String(a.approvedBy).trim(),evidenceRef:String(a.evidenceRef).trim()});
    }
    const code = String(item.itemCode||'').trim().toLowerCase();
    const org = existing || (a && validObjectId(a.organizationId) ? String(a.organizationId).toLowerCase() : '');
    if (code && org) {
      const ck = `${org}::${code}`;
      if (seenCodes.has(ck)) duplicateIds.push({recordType:'stockItem',organizationId:org,itemCode:code,reason:'DUPLICATE_TENANT_ITEM_CODE',otherRecordId:seenCodes.get(ck),recordId:id});
      else seenCodes.set(ck,id);
    }
  }
  const movementCodes = new Map();
  const itemIdsSeen = new Set(items.map(key).filter(Boolean));
  for (const movement of movements) {
    const id = key(movement);
    const parentId = String(movement.itemId || '').trim();
    const parent = itemById.get(parentId);
    if (!parent) blockers.push({recordType:'stockMovement',recordId:id,reason:'ORPHAN_OR_UNKNOWN_PARENT_ITEM'});
    const a = approvalMap.get(`stockMovement::${id}`);
    const itemOrg = String(parent && parent.organizationId || '').trim().toLowerCase();
    const approvedItem = approvalMap.get(`stockItem::${parentId}`);
    const approvedOrg = approvedItem && validObjectId(approvedItem.organizationId) ? String(approvedItem.organizationId).toLowerCase() : '';
    const resolvedOrg = itemOrg || approvedOrg;
    const existing = String(movement.organizationId || '').trim().toLowerCase();
    if (existing && resolvedOrg && existing !== resolvedOrg) {
      blockers.push({recordType:'stockMovement',recordId:id,reason:'MOVEMENT_PARENT_ORGANIZATION_CONFLICT'});
    } else if (a && validObjectId(a.organizationId) && resolvedOrg && String(a.organizationId).toLowerCase() !== resolvedOrg) {
      blockers.push({recordType:'stockMovement',recordId:id,reason:'MOVEMENT_APPROVAL_DIFFERS_FROM_PARENT'});
    } else if (!resolvedOrg) {
      blockers.push({recordType:'stockMovement',recordId:id,reason:'PARENT_ORGANIZATION_NOT_VERIFIED'});
    } else if (a && (!validObjectId(a.organizationId) || !String(a.approvedBy||'').trim() || !String(a.evidenceRef||'').trim())) {
      blockers.push({recordType:'stockMovement',recordId:id,reason:'INVALID_OR_INCOMPLETE_APPROVAL'});
    } else if (a && String(a.organizationId).toLowerCase() !== resolvedOrg) {
      blockers.push({recordType:'stockMovement',recordId:id,reason:'MOVEMENT_APPROVAL_DIFFERS_FROM_PARENT'});
    } else {
      actions.push({recordType:'stockMovement',recordId:id,action:existing?'NO_OP_ALREADY_MATCHES_PARENT':'PROPOSE_BACKFILL_FROM_VERIFIED_PARENT',organizationId:resolvedOrg,approvedBy:a?String(a.approvedBy).trim():'PARENT_OWNERSHIP_INHERITANCE',evidenceRef:a?String(a.evidenceRef).trim():`parent-stock-item:${parentId}`});
    }
    const code = String(movement.movementCode||'').trim().toLowerCase();
    if (code && resolvedOrg) {
      const ck = `${resolvedOrg}::${code}`;
      if (movementCodes.has(ck)) duplicateIds.push({recordType:'stockMovement',organizationId:resolvedOrg,movementCode:code,reason:'DUPLICATE_TENANT_MOVEMENT_CODE',otherRecordId:movementCodes.get(ck),recordId:id});
      else movementCodes.set(ck,id);
    }
  }
  const exportedKeys = new Set([
    ...items.map(x=>`stockItem::${key(x)}`),
    ...movements.map(x=>`stockMovement::${key(x)}`)
  ]);
  for (const k of approvalMap.keys()) if (!exportedKeys.has(k)) blockers.push({key:k,reason:'APPROVAL_RECORD_NOT_IN_EXPORT'});
  const uniqueBlockers = blockers;
  return {
    phase:128,
    title:'Inventory Control Migration Preflight',
    mode:'offline-export-only-dry-run',
    databaseConnectionAttempted:false,
    mutationsPerformed:false,
    migrationApproved:false,
    summary:{
      stockItems:items.length,
      stockMovements:movements.length,
      proposedOrNoopActions:actions.length,
      proposedItemBackfills:actions.filter(a=>a.action==='PROPOSE_BACKFILL_ONLY').length,
      proposedMovementBackfills:actions.filter(a=>a.action==='PROPOSE_BACKFILL_FROM_VERIFIED_PARENT').length,
      blockers:uniqueBlockers.length,
      duplicateOrIntegrityFindings:duplicateIds.length
    },
    actions,
    blockers:uniqueBlockers,
    integrityFindings:duplicateIds,
    indexPreflight:{
      requiredUniqueIndexes:[
        {name:'uniq_stock_item_org_code',keys:{organizationId:1,itemCode:1}},
        {name:'uniq_stock_movement_org_code',keys:{organizationId:1,movementCode:1}}
      ],
      note:'This offline report does not inspect actual MongoDB indexes. Inspect live indexes and duplicates before creating or dropping any index.'
    },
    releaseGate:{
      mayApplyMigration:false,
      conditions:[
        'Resolve all blockers and integrity findings.',
        'Verify each ownership approval and evidence reference independently.',
        'Inspect live MongoDB indexes; plan legacy global itemCode index removal only after duplicate checks.',
        'Back up and verify restore; rehearse on a non-production copy.',
        'Review counts and approve a separate migration execution plan.'
      ]
    }
  };
}

async function liveIndexInventory(uri, dbName) {
  if (!uri) throw new Error('--live-indexes requires FORESTOS_MONGO_URI');
  let mongoose;
  try { mongoose = require('mongoose'); }
  catch { throw new Error('mongoose package not available from this script runtime'); }
  await mongoose.connect(uri, { dbName: dbName || undefined, serverSelectionTimeoutMS: 5000 });
  try {
    const db = mongoose.connection.db;
    const results = {};
    for (const name of ['stockitems','stockmovements']) {
      try { results[name] = await db.collection(name).listIndexes().toArray(); }
      catch (e) { results[name] = {error:String(e.message||e)}; }
    }
    return {mode:'live-index-inventory-read-only',databaseConnectionAttempted:true,mutationsPerformed:false,collections:results,
      warning:'Read-only index inspection only. Collection names may differ in deployment; confirm exact collection names before relying on this output.'};
  } finally { await mongoose.disconnect(); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--live-indexes')) {
    const report = await liveIndexInventory(process.env.FORESTOS_MONGO_URI, process.env.FORESTOS_MONGO_DB);
    console.log(JSON.stringify(report,null,2));
    return;
  }
  const [exportPath, manifestPath] = args;
  if (!exportPath || !manifestPath) {
    console.error('Usage: node phase128-inventory-migration-preflight.js <export.json> <ownership-manifest.json>');
    console.error('Optional read-only index inspection: FORESTOS_MONGO_URI=<non-production URI> node phase128-inventory-migration-preflight.js --live-indexes');
    process.exit(2); return;
  }
  const data = JSON.parse(fs.readFileSync(exportPath,'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const report = buildReport(data,manifest);
  console.log(JSON.stringify(report,null,2));
  if (report.summary.blockers || report.summary.duplicateOrIntegrityFindings) process.exitCode = 3;
}
if (require.main === module) main().catch(e=>{console.error('Phase 128 preflight failed: '+e.message);process.exit(1);});
module.exports = {buildReport, validObjectId};
