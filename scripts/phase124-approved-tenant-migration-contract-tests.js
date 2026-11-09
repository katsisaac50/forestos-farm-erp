#!/usr/bin/env node
'use strict'; const {buildPlan}=require('./phase124-approved-tenant-migration-dry-run'); let passed=0,failed=0;
function test(n,f){try{if(!f())throw Error('false');passed++;console.log('PASS '+n)}catch(e){failed++;console.error('FAIL '+n+': '+e.message)}}
const org='aaaaaaaaaaaaaaaaaaaaaaaa', other='bbbbbbbbbbbbbbbbbbbbbbbb';
const data={salesOrders:[{_id:'s1',orderId:'SO-1'},{_id:'s2',orderId:'SO-2',organizationId:org}],inventoryItems:[{_id:'i1',itemId:'I-1'}]};
const approval=(domain,recordId,organizationId=org)=>({domain,recordId,organizationId,approvedBy:'reviewer@example.test',evidenceRef:'ledger:page-12'});
let r=buildPlan(data,{approvals:[approval('sales','s1'),approval('sales','s2'),approval('inventory','i1')]});
test('dry run never connects or mutates',()=>r.databaseConnection===false&&r.mutationsPerformed===false&&r.mode==='DRY_RUN_ONLY');
test('proposes backfill only for approved unowned record',()=>r.summary.proposedBackfills===2);
test('already-matching owner is a no-op',()=>r.summary.noOps===1);
test('valid approval creates action with evidence',()=>r.actions.every(x=>x.evidenceRef&&x.approvedBy));
r=buildPlan(data,{approvals:[approval('sales','s1',other)]});
test('uncovered records are not auto-assigned',()=>r.uncovered.length===2);
test('existing ownership conflict blocks proposal',()=>buildPlan(data,{approvals:[approval('sales','s2',other)]}).blockers[0].reason==='EXISTING_ORGANIZATION_CONFLICT');
test('invalid organization id blocked',()=>buildPlan(data,{approvals:[approval('sales','s1','bad')]}).blockers[0].reason==='INVALID_APPROVED_ORGANIZATION_ID');
test('missing evidence blocked',()=>buildPlan(data,{approvals:[{domain:'sales',recordId:'s1',organizationId:org,approvedBy:'reviewer'}]}).blockers[0].reason==='MISSING_APPROVER_OR_EVIDENCE_REFERENCE');
test('duplicate approval blocked',()=>buildPlan(data,{approvals:[approval('sales','s1'),approval('sales','s1')]}).blockers.some(x=>x.reason==='DUPLICATE_APPROVAL'));
test('unknown record blocked',()=>buildPlan(data,{approvals:[approval('sales','missing')]}).blockers[0].reason==='RECORD_NOT_FOUND_IN_EXPORT');
test('rejects malformed export',()=>{try{buildPlan({}, {approvals:[]});return false}catch(e){return true}});
test('rejects malformed approval shape',()=>{try{buildPlan(data, {});return false}catch(e){return true}});
test('reports no production readiness',()=>r.productionReady===false);
console.log(`Phase 124 contract tests: ${passed}/12 passed`); if(failed)process.exitCode=1;
