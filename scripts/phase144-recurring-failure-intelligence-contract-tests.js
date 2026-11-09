#!/usr/bin/env node
'use strict';
const assert=require('assert');const {analyze}=require('./phase144-recurring-failure-intelligence');let passed=0;
function t(n,f){try{f();passed++}catch(e){console.error('FAIL '+n+': '+e.message);process.exitCode=1}}
function fail(id,over={}){return {id,title:'Weeding quality issue',signature:'incomplete_weeding',area:'Block A',type:'weeding',severity:'medium',source:'inspection',date:'2026-10-20',...over}}
function base(over={}){return {failures:[fail('F1'),fail('F2',{date:'2026-10-21'}),fail('F3',{date:'2026-10-22'})],actions:[],...over}}
t('detects recurring failure at threshold',()=>assert.equal(analyze(base(),'2026-10-28').summary.recurringPatterns,1));
t('groups same signature within same area',()=>assert.equal(analyze({failures:[fail('F1'),fail('F2',{area:'Block B'})],actions:[]},'2026-10-28').summary.recurringPatterns,0));
t('custom threshold works',()=>assert.equal(analyze(base(),'2026-10-28',3).summary.recurringPatterns,1));
t('threshold one rejected',()=>assert(analyze(base(),'2026-10-28',1).errors.some(e=>e.code==='invalid_threshold')));
t('requires failures array',()=>assert(analyze({},'2026-10-28').errors.some(e=>e.code==='failures_required')));
t('failure IDs unique',()=>assert(analyze({failures:[fail('F1'),fail('F1')],actions:[]},'2026-10-28').errors.some(e=>e.code==='duplicate_failure_id')));
t('requires failure title',()=>assert(analyze({failures:[fail('F1',{title:''})],actions:[]},'2026-10-28').errors.some(e=>e.code==='failure_title_required')));
t('requires signature',()=>assert(analyze({failures:[fail('F1',{signature:''})],actions:[]},'2026-10-28').errors.some(e=>e.code==='failure_signature_required')));
t('requires area',()=>assert(analyze({failures:[fail('F1',{area:''})],actions:[]},'2026-10-28').errors.some(e=>e.code==='failure_area_required')));
t('validates severity',()=>assert(analyze({failures:[fail('F1',{severity:'extreme'})],actions:[]},'2026-10-28').errors.some(e=>e.code==='invalid_severity')));
t('validates source',()=>assert(analyze({failures:[fail('F1',{source:'random'})],actions:[]},'2026-10-28').errors.some(e=>e.code==='invalid_source')));
t('validates failure date',()=>assert(analyze({failures:[fail('F1',{date:'2026-02-30'})],actions:[]},'2026-10-28').errors.some(e=>e.code==='invalid_failure_date')));
t('future failure date warning',()=>assert(analyze({failures:[fail('F1',{date:'2026-10-29'})],actions:[]},'2026-10-28').warnings.some(e=>e.code==='future_failure_date')));
t('highest severity promoted in recurrence',()=>{const r=analyze({failures:[fail('F1',{severity:'low'}),fail('F2',{severity:'critical'} )],actions:[]},'2026-10-28');assert.equal(r.recurringPatterns[0].highestSeverity,'critical')});
t('recurrence alert severity critical',()=>assert(analyze({failures:[fail('F1',{severity:'critical'}),fail('F2',{severity:'low'})],actions:[]},'2026-10-28').alerts.some(a=>a.code==='recurring_failure'&&a.severity==='critical')));
t('separates recurrence by area',()=>assert.equal(analyze({failures:[fail('F1'),fail('F2',{area:'Block B'})],actions:[]},'2026-10-28').summary.recurringPatterns,0));
t('reports linked CAPA ids',()=>{const r=analyze({failures:[fail('F1',{capaId:'C1'}),fail('F2',{capaId:'C1'})],actions:[]},'2026-10-28');assert.deepEqual(r.recurringPatterns[0].linkedCapaIds,['C1'])});
t('area ranking is descending',()=>{const r=analyze({failures:[fail('F1'),fail('F2'),fail('F3',{area:'Block B'})],actions:[]},'2026-10-28');assert.equal(r.areaRanking[0].area,'Block A')});
t('type ranking counts types',()=>assert.equal(analyze(base(),'2026-10-28').typeRanking[0].type,'weeding'));
t('action IDs unique',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'open',dueDate:'2026-10-30'},{id:'A',title:'Fix again',status:'open',dueDate:'2026-10-30'}]},'2026-10-28').errors.some(e=>e.code==='duplicate_action_id')));
t('action status validated',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'done',dueDate:'2026-10-30'}]},'2026-10-28').errors.some(e=>e.code==='invalid_action_status')));
t('action due date validated',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'open',dueDate:'bad'}]},'2026-10-28').errors.some(e=>e.code==='invalid_action_due_date')));
t('overdue open action alert',()=>assert.equal(analyze({failures:[],actions:[{id:'A',title:'Firebreak repair',status:'open',dueDate:'2026-10-27'}]},'2026-10-28').summary.overdueActions,1));
t('effective action not overdue',()=>assert.equal(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'effective',dueDate:'2026-10-01',verifiedBy:'Supervisor',verifiedDate:'2026-10-02'}]},'2026-10-28').summary.overdueActions,0));
t('effective requires verification identity and date',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'effective',dueDate:'2026-10-30'}]},'2026-10-28').errors.some(e=>e.code==='effectiveness_verification_required')));
t('ineffective action emits alert',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'ineffective',dueDate:'2026-10-30'}]},'2026-10-28').alerts.some(a=>a.code==='ineffective_corrective_action')));
t('open actions counted',()=>assert.equal(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'in_progress',dueDate:'2026-10-30'}]},'2026-10-28').summary.openActions,1));
t('critical open actions counted',()=>assert.equal(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'open',severity:'critical',dueDate:'2026-10-30'}]},'2026-10-28').summary.criticalOpenActions,1));
t('actions array type validated',()=>assert(analyze({failures:[],actions:{}},'2026-10-28').errors.some(e=>e.code==='actions_must_be_array')));
t('failure IDs linked into recurring pattern',()=>{const r=analyze(base(),'2026-10-28');assert.deepEqual(r.recurringPatterns[0].failureIds,['F1','F2','F3'])});
t('empty input arrays report zero',()=>{const r=analyze({failures:[],actions:[]},'2026-10-28');assert.equal(r.summary.failureCount,0);assert.equal(r.summary.recurringPatterns,0)});
t('invalid now is reported',()=>assert(analyze(base(),'2026-02-30').errors.some(e=>e.code==='invalid_now')));
t('closed action without effective prior status warns',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Fix',status:'closed',dueDate:'2026-10-01'}]},'2026-10-28').warnings.some(e=>e.code==='closed_without_effective_status')));
t('action severity alert carries critical',()=>assert(analyze({failures:[],actions:[{id:'A',title:'Urgent',status:'open',severity:'critical',dueDate:'2026-10-01'}]},'2026-10-28').alerts.some(a=>a.code==='overdue_corrective_action'&&a.severity==='critical')));
t('non-array failure row flagged',()=>assert(analyze({failures:[null],actions:[]},'2026-10-28').errors.some(e=>e.code==='invalid_failure')));
t('failure event total reflects recurring pattern counts',()=>assert.equal(analyze(base(),'2026-10-28').summary.recurringFailureEvents,3));
console.log(`Phase 144 recurring-failure intelligence tests: ${passed} passed.`);
