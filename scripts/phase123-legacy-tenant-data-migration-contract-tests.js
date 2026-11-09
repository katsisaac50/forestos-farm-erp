#!/usr/bin/env node
'use strict';
const {audit}=require('./phase123-legacy-tenant-data-migration-audit.js');let passed=0;
function ok(name,cond){if(!cond){console.error('FAIL '+name);process.exitCode=1;}else{passed++;console.log('PASS '+name)}}
const a='aaaaaaaaaaaaaaaaaaaaaaaa', b='bbbbbbbbbbbbbbbbbbbbbbbb';
const report=audit({salesOrders:[{_id:'s1',orderId:'SO-1',organizationId:a},{_id:'s2',orderId:'SO-2'},{_id:'s3',orderId:'SO-3',organizationId:'bad'},{_id:'s4',orderId:'SO-1',organizationId:a}],inventoryItems:[{_id:'i1',itemId:'ITEM-1',organizationId:b},{_id:'i2',itemId:'',organizationId:b}]});
ok('report labels audit read-only',report.mode==='READ_ONLY_EXPORT_AUDIT');
ok('never connects to database',report.databaseConnection===false);
ok('never performs mutations',report.mutationsPerformed===false);
ok('counts total records',report.summary.records===6);
ok('detects missing organization',report.summary.missingOrganizationId===1);
ok('detects malformed organization id',report.summary.invalidOrganizationId===1);
ok('detects missing business identifier',report.summary.missingIdentifier===1);
ok('detects duplicate tenant identifier',report.summary.duplicateTenantIdentifiers===1);
ok('duplicate findings flagged on both records',report.domains.sales.manualReviewCount>=3);
ok('inventory findings separated from sales',report.domains.inventory.records===2);
ok('includes ownership provenance warning',report.warnings.some(x=>/provenance/i.test(x)));
ok('does not claim to backfill records',!('backfilledRecords' in report.summary));
let threw=false;try{audit({salesOrders:[],inventoryItems:null})}catch(e){threw=true}ok('rejects malformed export shape',threw);
console.log(`Phase 123 contract tests: ${passed}/12 passed`);
