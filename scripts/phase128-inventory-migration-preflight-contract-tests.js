#!/usr/bin/env node
'use strict';
const assert = require('assert');
const {buildReport, validObjectId} = require('./phase128-inventory-migration-preflight');
const orgA='aaaaaaaaaaaaaaaaaaaaaaaa', orgB='bbbbbbbbbbbbbbbbbbbbbbbb';
const item1={_id:'item-1',itemCode:'SEED-1',organizationId:orgA};
const item2={_id:'item-2',itemCode:'SEED-1',organizationId:orgA};
const movement1={_id:'move-1',itemId:'item-1',movementCode:'MV-1'};
const data={stockItems:[item1,item2],stockMovements:[movement1]};
const manifest={approvals:[
 {recordType:'stockItem',recordId:'item-1',organizationId:orgA,approvedBy:'reviewer',evidenceRef:'ticket-1'},
 {recordType:'stockItem',recordId:'item-2',organizationId:orgA,approvedBy:'reviewer',evidenceRef:'ticket-2'},
 {recordType:'stockMovement',recordId:'move-1',organizationId:orgA,approvedBy:'reviewer',evidenceRef:'ticket-3'}
]};
const checks=[];
function check(name,fn){try{fn();checks.push([name,true]);}catch(e){checks.push([name,false,e.message]);}}
check('accepts valid 24-character ObjectId',()=>assert.equal(validObjectId(orgA),true));
check('rejects invalid ObjectId',()=>assert.equal(validObjectId('not-an-id'),false));
check('report is offline dry-run and mutation-free',()=>{const r=buildReport(data,manifest);assert.equal(r.databaseConnectionAttempted,false);assert.equal(r.mutationsPerformed,false);assert.equal(r.migrationApproved,false);});
check('requires explicit stock-item approvals',()=>{const r=buildReport(data,{approvals:[]});assert(r.blockers.some(x=>x.reason==='NO_EXPLICIT_OWNERSHIP_APPROVAL'));});
check('proposes item backfill only with valid evidence',()=>{const r=buildReport({stockItems:[{_id:'i1',itemCode:'A'}],stockMovements:[]},{approvals:[{recordType:'stockItem',recordId:'i1',organizationId:orgA,approvedBy:'person',evidenceRef:'case-1'}]});assert.equal(r.actions[0].action,'PROPOSE_BACKFILL_ONLY');});
check('detects duplicate tenant item codes',()=>{const r=buildReport(data,manifest);assert(r.integrityFindings.some(x=>x.reason==='DUPLICATE_TENANT_ITEM_CODE'));});
check('detects orphan movement parent',()=>{const r=buildReport({stockItems:[],stockMovements:[{_id:'m1',itemId:'missing'}]},{approvals:[]});assert(r.blockers.some(x=>x.reason==='ORPHAN_OR_UNKNOWN_PARENT_ITEM'));});
check('movement ownership follows verified parent organization',()=>{const r=buildReport({stockItems:[{_id:'i1',itemCode:'A'}],stockMovements:[{_id:'m1',itemId:'i1',movementCode:'M'}]},{approvals:[{recordType:'stockItem',recordId:'i1',organizationId:orgA,approvedBy:'reviewer',evidenceRef:'e'}]});assert(r.actions.some(x=>x.recordType==='stockMovement'&&x.organizationId===orgA));});
check('blocks movement approval conflicting with parent',()=>{const r=buildReport({stockItems:[{_id:'i1',itemCode:'A'}],stockMovements:[{_id:'m1',itemId:'i1',movementCode:'M'}]},{approvals:[{recordType:'stockItem',recordId:'i1',organizationId:orgA,approvedBy:'reviewer',evidenceRef:'e'},{recordType:'stockMovement',recordId:'m1',organizationId:orgB,approvedBy:'reviewer',evidenceRef:'e2'}]});assert(r.blockers.some(x=>x.reason==='MOVEMENT_APPROVAL_DIFFERS_FROM_PARENT'));});
check('detects duplicate tenant movement codes',()=>{const r=buildReport({stockItems:[{_id:'i1',itemCode:'A',organizationId:orgA},{_id:'i2',itemCode:'B',organizationId:orgA}],stockMovements:[{_id:'m1',itemId:'i1',movementCode:'M'},{_id:'m2',itemId:'i2',movementCode:'M'}]},{approvals:[]});assert(r.integrityFindings.some(x=>x.reason==='DUPLICATE_TENANT_MOVEMENT_CODE'));});
check('flags approvals not found in export',()=>{const r=buildReport({stockItems:[],stockMovements:[]},{approvals:[{recordType:'stockItem',recordId:'ghost',organizationId:orgA,approvedBy:'a',evidenceRef:'e'}]});assert(r.blockers.some(x=>x.reason==='APPROVAL_RECORD_NOT_IN_EXPORT'));});
check('index inspection is opt-in and read-only',()=>{const s=require('fs').readFileSync(require('path').join(__dirname,'phase128-inventory-migration-preflight.js'),'utf8');assert(s.includes('--live-indexes'));assert(s.includes('listIndexes().toArray()'));assert(!/\.updateMany\(|\.bulkWrite\(|\.insertMany\(/.test(s));});
check('release gate always blocks direct migration',()=>{const r=buildReport(data,manifest);assert.equal(r.releaseGate.mayApplyMigration,false);});
check('reports exact unique index plan',()=>{const r=buildReport(data,manifest);assert.equal(r.indexPreflight.requiredUniqueIndexes.length,2);});
check('rejects malformed export',()=>assert.throws(()=>buildReport({}, {approvals:[]})));
check('rejects malformed manifest',()=>assert.throws(()=>buildReport({stockItems:[],stockMovements:[]},{})));
const failed=checks.filter(x=>!x[1]);
checks.forEach(x=>console.log(`${x[1]?'PASS':'FAIL'} ${x[0]}${x[2]?': '+x[2]:''}`));
console.log(`Phase 128 contract tests: ${checks.length-failed.length}/${checks.length} passed`);
if(failed.length)process.exit(1);
