#!/usr/bin/env node
'use strict';
const assert=require('assert'),{evaluate}=require('./phase135-incident-register-corrective-actions');
const now='2026-10-27T18:00:00Z';
const clean=[{incidentId:'INC-135-01',title:'Elevated API latency',reportedAt:'2026-10-25T10:00:00Z',severity:'SEV3',status:'MONITORING',owner:'api-owner',service:'inventory-api',rootCauseCategory:'RESOURCE_SATURATION',correctiveActions:[{actionId:'ACT-135-01',description:'Tune slow query',owner:'db-owner',dueDate:'2026-11-01T00:00:00Z',status:'IN_PROGRESS'}]}];
let passed=0;function test(n,f){try{f();passed++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n+': '+e.message);process.exitCode=1}}
test('valid register summary',()=>assert.strictEqual(evaluate({incidentRegister:clean,now}).summary.incidentCount,1));
test('rejects non-array register',()=>assert.ok(evaluate({incidentRegister:{},now}).findings.some(f=>f.code==='REGISTER_INVALID')));
test('detects duplicate incident IDs',()=>assert.ok(evaluate({incidentRegister:[clean[0],{...clean[0]}],now}).findings.some(f=>f.code==='DUPLICATE_INCIDENT_ID')));
test('detects missing incident owner',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],owner:''}],now}).findings.some(f=>f.code==='INCIDENT_FIELD_MISSING'&&f.evidence.field==='owner')));
test('rejects invalid severity',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],severity:'SEV0'}],now}).findings.some(f=>f.code==='INVALID_SEVERITY')));
test('rejects invalid incident status',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],status:'DONE'}],now}).findings.some(f=>f.code==='INVALID_INCIDENT_STATUS')));
test('closed incident requires timestamp',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],status:'CLOSED',closedAt:'',closureApproved:true}],now}).findings.some(f=>f.code==='CLOSED_WITHOUT_TIMESTAMP')));
test('closed incident requires approval',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],status:'CLOSED',closedAt:now,closureApproved:false}],now}).findings.some(f=>f.code==='CLOSED_WITHOUT_APPROVAL')));
test('detects overdue action',()=>{const r=evaluate({incidentRegister:[{...clean[0],correctiveActions:[{...clean[0].correctiveActions[0],dueDate:'2026-10-01T00:00:00Z'}]}],now});assert.ok(r.findings.some(f=>f.code==='ACTION_OVERDUE'));assert.strictEqual(r.summary.overdueActionCount,1)});
test('completed action requires evidence',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:[{...clean[0].correctiveActions[0],status:'COMPLETE'}]}],now}).findings.some(f=>f.code==='COMPLETION_EVIDENCE_MISSING')));
test('duplicate action IDs rejected',()=>{const a=clean[0].correctiveActions[0];assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:[a,{...a}]}],now}).findings.some(f=>f.code==='DUPLICATE_ACTION_ID'))});
test('blocked action emits warning',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:[{...clean[0].correctiveActions[0],status:'BLOCKED'}]}],now}).findings.some(f=>f.code==='ACTION_BLOCKED')));
test('recurrence pattern flagged',()=>assert.ok(evaluate({incidentRegister:[clean[0],{...clean[0],incidentId:'INC-135-02'}],now}).findings.some(f=>f.code==='RECURRENCE_PATTERN')));
test('invalid action status rejected',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:[{...clean[0].correctiveActions[0],status:'DONE'}]}],now}).findings.some(f=>f.code==='INVALID_ACTION_STATUS')));
test('invalid due date rejected',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:[{...clean[0].correctiveActions[0],dueDate:'soon'}]}],now}).findings.some(f=>f.code==='INVALID_ACTION_DUE_DATE')));
test('requires correctiveActions array',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],correctiveActions:null}],now}).findings.some(f=>f.code==='ACTIONS_NOT_ARRAY')));
test('empty register has zero counts',()=>assert.strictEqual(evaluate({incidentRegister:[],now}).summary.incidentCount,0));
test('counts open incidents',()=>assert.strictEqual(evaluate({incidentRegister:clean,now}).summary.openIncidentCount,1));
test('closure policy requires human review',()=>assert.strictEqual(evaluate({incidentRegister:clean,now}).closurePolicy.requiresHumanReview,true));
test('invalid incident timestamp rejected',()=>assert.ok(evaluate({incidentRegister:[{...clean[0],reportedAt:'bad'}],now}).findings.some(f=>f.code==='INVALID_REPORTED_AT')));
console.log(`${passed}/20 Phase 135 contract tests passed`);
