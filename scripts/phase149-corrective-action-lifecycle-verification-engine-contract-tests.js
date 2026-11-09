#!/usr/bin/env node
'use strict';
const assert=require('assert');
const {run,createAction,parseArgs,dateOnly}=require('./phase149-corrective-action-lifecycle-verification-engine');
let passed=0;function test(n,f){try{f();passed++;}catch(e){console.error(`FAIL ${n}: ${e.stack}`);process.exitCode=1;}}
function base(action={actionId:'A-1',title:'Investigate tree mortality',priority:'high',dueDate:'2026-11-03'}){return {generatedAt:'2026-10-29',actions:[action]};}
function event(type,more={}){return {type,actor:'Supervisor One',...more};}
function fullEvents(){return [
 event('assign',{owner:'Worker A'}),event('start'),event('add_evidence',{description:'Inspection photos reviewed',reference:'evidence/forest-1.jpg'}),
 event('submit_verification'),event('verify_effective',{actor:'Independent Reviewer',reviewer:'Independent Reviewer',notes:'Evidence confirms action was effective'})
];}
test('empty action ledger works',()=>assert.strictEqual(run({generatedAt:'2026-10-29',actions:[]}).summary.totalActions,0));
test('report type stable',()=>assert.strictEqual(run(base()).reportType,'forestos.corrective-action-lifecycle'));
test('offline mode explicit',()=>assert.strictEqual(run(base()).mode,'offline_event_ledger'));
test('new action starts proposed',()=>assert.strictEqual(run(base()).actions[0].status,'proposed'));
test('new action history includes created event',()=>assert.strictEqual(run(base()).actions[0].history[0].type,'created'));
test('action ID generated when absent',()=>assert(run(base({title:'Check hive health'})).actions[0].actionId.startsWith('CAPA-')));
test('required title validated',()=>assert.throws(()=>run(base({actionId:'x'}))));
test('due date validated',()=>assert.throws(()=>run(base({title:'x',dueDate:'2026-02-30'}))));
test('assign action and owner',()=>{const a=run(base({title:'x',events:[event('assign',{owner:'Worker A'})]})).actions[0];assert.strictEqual(a.status,'assigned');assert.strictEqual(a.owner,'Worker A');});
test('assignment requires owner',()=>assert.throws(()=>run(base({title:'x',events:[event('assign')]}))));
test('assignment requires actor',()=>assert.throws(()=>run(base({title:'x',events:[{type:'assign',owner:'Worker A'}]}))));
test('start after assignment',()=>assert.strictEqual(run(base({title:'x',events:[event('assign',{owner:'Worker A'}),event('start')]})).actions[0].status,'in_progress'));
test('cannot start proposed action directly',()=>assert.throws(()=>run(base({title:'x',events:[event('start')]}))));
test('evidence description required',()=>assert.throws(()=>run(base({title:'x',events:[event('assign',{owner:'Worker A'}),event('add_evidence')]}))));
test('evidence recorded with actor and date',()=>{const a=run(base({title:'x',events:[event('assign',{owner:'Worker A'}),event('add_evidence',{description:'Photo set'})]})).actions[0];assert.strictEqual(a.evidence[0].capturedBy,'Supervisor One');assert.strictEqual(a.evidence[0].capturedAt,'2026-10-29');});
test('cannot submit verification without evidence',()=>assert.throws(()=>run(base({title:'x',events:[event('assign',{owner:'Worker A'}),event('start'),event('submit_verification')]}))));
test('submit verification after evidence',()=>{const a=run(base({title:'x',events:[event('assign',{owner:'Worker A'}),event('start'),event('add_evidence',{description:'Photos'}),event('submit_verification')]})).actions[0];assert.strictEqual(a.status,'pending_verification');});
test('cannot verify before submission',()=>assert.throws(()=>run(base({title:'x',events:[event('verify_effective',{notes:'ok'})]}))));
test('verification requires notes',()=>assert.throws(()=>run(base({title:'x',events:[...fullEvents().slice(0,4),event('verify_effective',{reviewer:'Other',notes:''})]}))));
test('independent verification prevents self-review',()=>assert.throws(()=>run(base({title:'x',events:[...fullEvents().slice(0,4),event('verify_effective',{actor:'Supervisor One',reviewer:'Supervisor One',notes:'Looks good'})]}))));
test('successful verification closes action',()=>{const a=run(base({title:'x',events:fullEvents()})).actions[0];assert.strictEqual(a.status,'verified_effective');assert.strictEqual(a.effectiveness.effective,true);});
test('successful verification records reviewer',()=>assert.strictEqual(run(base({title:'x',events:fullEvents()})).actions[0].verification.reviewer,'Independent Reviewer'));
test('ineffective verification remains open',()=>{const ev=fullEvents().slice(0,4).concat(event('verify_ineffective',{actor:'Independent Reviewer',reviewer:'Independent Reviewer',notes:'Follow-up shows the issue persists'}));const r=run(base({title:'x',events:ev}));assert.strictEqual(r.actions[0].status,'ineffective');assert.strictEqual(r.summary.openActions,1);});
test('ineffective action can be reassigned',()=>{const ev=fullEvents().slice(0,4).concat(event('verify_ineffective',{actor:'Independent Reviewer',reviewer:'Independent Reviewer',notes:'Not effective'}),event('assign',{owner:'Worker B'}));assert.strictEqual(run(base({title:'x',events:ev})).actions[0].status,'assigned');});
test('verified action can be reopened with reason',()=>{const ev=fullEvents().concat(event('reopen',{reason:'Issue reappeared during next inspection'}));const a=run(base({title:'x',events:ev})).actions[0];assert.strictEqual(a.status,'reopened');assert.strictEqual(a.reopenCount,1);});
test('reopen reason required',()=>assert.throws(()=>run(base({title:'x',events:[...fullEvents(),event('reopen')]}))));
test('reopened action can restart',()=>{const ev=fullEvents().concat(event('reopen',{reason:'Recurrence'}),event('start'));assert.strictEqual(run(base({title:'x',events:ev})).actions[0].status,'in_progress');});
test('cancel reason required',()=>assert.throws(()=>run(base({title:'x',events:[event('cancel')]}))));
test('proposed action can be cancelled',()=>assert.strictEqual(run(base({title:'x',events:[event('cancel',{reason:'Duplicate request'})]})).actions[0].status,'cancelled'));
test('verified action cannot be cancelled',()=>assert.throws(()=>run(base({title:'x',events:[...fullEvents(),event('cancel',{reason:'x'})]}))));
test('duplicate action IDs rejected',()=>assert.throws(()=>run({generatedAt:'2026-10-29',actions:[{actionId:'x',title:'A'},{actionId:'x',title:'B'}]})));
test('events must be array',()=>assert.throws(()=>run(base({title:'x',events:{}}))));
test('unknown event rejected',()=>assert.throws(()=>run(base({title:'x',events:[event('magic')]}))));
test('event history grows after assignment',()=>assert.strictEqual(run(base({title:'x',events:[event('assign',{owner:'A'})]})).actions[0].history.length,2));
test('event IDs deterministic',()=>assert.strictEqual(run(base({title:'x',events:[event('assign',{owner:'A'})]})).actions[0].history[1].eventId,run(base({title:'x',events:[event('assign',{owner:'A'})]})).actions[0].history[1].eventId));
test('evidence IDs deterministic',()=>assert.strictEqual(run(base({title:'x',events:[event('assign',{owner:'A'}),event('add_evidence',{description:'Photo'})]})).actions[0].evidence[0].evidenceId,run(base({title:'x',events:[event('assign',{owner:'A'}),event('add_evidence',{description:'Photo'})]})).actions[0].evidence[0].evidenceId));
test('overdue open action counted',()=>assert.strictEqual(run(base({actions:undefined,title:'x',dueDate:'2026-10-01'})).summary.overdue,1));
test('verified effective action not counted overdue',()=>{const ev=fullEvents();const r=run(base({title:'x',dueDate:'2026-10-01',events:ev}));assert.strictEqual(r.summary.overdue,0);});
test('cancelled action not counted open',()=>assert.strictEqual(run(base({title:'x',events:[event('cancel',{reason:'not needed'})]})).summary.openActions,0));
test('reopened action increments count',()=>{const ev=fullEvents().concat(event('reopen',{reason:'recurrence'}),event('assign',{owner:'A'}),event('start'),event('add_evidence',{description:'New evidence'}),event('submit_verification'),event('verify_ineffective',{actor:'Independent Reviewer',reviewer:'Independent Reviewer',notes:'Still failing'}));assert.strictEqual(run(base({title:'x',events:ev})).actions[0].reopenCount,1);});
test('actor must be non-empty',()=>assert.throws(()=>run(base({title:'x',events:[{type:'assign',owner:'A',actor:' ' }]}))));
test('date override deterministic',()=>assert.strictEqual(run(base(),{now:'2026-10-30'}).generatedAt,'2026-10-30'));
test('date parser rejects impossible dates',()=>assert.throws(()=>dateOnly('2026-02-30')));
test('date parser accepts valid date',()=>assert.strictEqual(dateOnly('2026-10-29'),'2026-10-29'));
test('parse args valid',()=>assert.deepStrictEqual(parseArgs(['--input=a','--output=b','--now=2026-10-29']),{input:'a',output:'b',now:'2026-10-29'}));
test('parse args requires input',()=>assert.throws(()=>parseArgs([])));
test('parse args rejects unknown args',()=>assert.throws(()=>parseArgs(['--input=a','--x=b'])));
test('input object required',()=>assert.throws(()=>run([])));
test('actions array required',()=>assert.throws(()=>run({})));
test('governance explains no external changes',()=>assert.strictEqual(run(base()).governance.automaticExecution,false));
test('status counts proposed',()=>assert.strictEqual(run(base()).summary.statusCounts.proposed,1));
test('verified effective count',()=>assert.strictEqual(run(base({title:'x',events:fullEvents()})).summary.verifiedEffective,1));
test('evidence requires capture actor',()=>assert.strictEqual(run(base({title:'x',events:[event('assign',{owner:'A'}),event('add_evidence',{description:'Evidence'})]})).actions[0].evidence[0].capturedBy,'Supervisor One'));
test('cancelled status count',()=>assert.strictEqual(run(base({title:'x',events:[event('cancel',{reason:'cancel'})]})).summary.statusCounts.cancelled,1));
test('source finding preserved',()=>assert.strictEqual(run(base({title:'x',sourceFinding:{metric:'treeCount'}})).actions[0].sourceFinding.metric,'treeCount'));
test('status count sum reflects actions',()=>{const r=run({generatedAt:'2026-10-29',actions:[{title:'a'},{title:'b'}]});assert.strictEqual(Object.values(r.summary.statusCounts).filter((_,i)=>i<8).reduce((a,b)=>a+b,0),2);});
test('imported snapshot requires history and evidence',()=>assert.throws(()=>run({generatedAt:'2026-10-29',actions:[{actionId:'x',title:'x',status:'proposed',history:[]}]})));
test('due date future is not overdue',()=>assert.strictEqual(run(base()).summary.overdue,0));
test('history event dates cannot predate run date',()=>assert.throws(()=>run(base({title:'x',events:[{type:'assign',actor:'S',owner:'A',at:'2026-10-01'}]}))));
if(!process.exitCode)console.log(`Phase 149 contract tests: ${passed} passed`);
