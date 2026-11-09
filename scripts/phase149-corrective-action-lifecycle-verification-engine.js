#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 149 — Corrective Action Lifecycle & Verification Engine
 * Offline JSON lifecycle ledger with append-style event history, transition rules,
 * evidence metadata, effectiveness verification and reopening support.
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function dateOnly(s,label='date'){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error(`${label} must use YYYY-MM-DD`);
 const d=new Date(`${s}T00:00:00Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)throw new Error(`${label} must be a real date`);return s;
}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function idFor(action){return `CAPA-${hash(JSON.stringify({findingCode:action.findingCode||'',sourceFinding:action.sourceFinding||{},title:action.title||''})).slice(0,12).toUpperCase()}`;}
const TRANSITIONS={
 proposed:new Set(['assigned','cancelled']),
 assigned:new Set(['in_progress','cancelled']),
 in_progress:new Set(['pending_verification','assigned','cancelled']),
 pending_verification:new Set(['verified_effective','ineffective','in_progress']),
 ineffective:new Set(['assigned','in_progress','cancelled']),
 verified_effective:new Set(['reopened']),
 reopened:new Set(['assigned','in_progress','cancelled']),
 cancelled:new Set()
};
function eventFor(action,type,at,actor,details={}){
 return {eventId:`EVT-${hash(JSON.stringify({actionId:action.actionId,type,at,actor,details,seq:(action.history||[]).length})).slice(0,12).toUpperCase()}`,
  type,at,actor,details};
}
function createAction(input,now){
 if(!obj(input))throw new Error('Action must be an object');
 const title=typeof input.title==='string'&&input.title.trim()?input.title.trim():null;
 if(!title)throw new Error('Action title is required');
 const priority=['critical','high','medium','low'].includes(input.priority)?input.priority:'medium';
 const dueDate=dateOnly(input.dueDate||now,'dueDate');
 const actionId=typeof input.actionId==='string'&&input.actionId.trim()?input.actionId.trim():idFor({...input,title});
 const action={
  actionId,title,description:typeof input.description==='string'?input.description:'',
  findingCode:typeof input.findingCode==='string'?input.findingCode:'GENERAL',
  priority,owner:input.owner===undefined?null:input.owner,ownerRole:input.ownerRole||null,
  createdAt:dateOnly(input.createdAt||now,'createdAt'),dueDate,status:'proposed',
  evidence:[],verification:null,effectiveness:null,reopenCount:0,
  sourceFinding:obj(input.sourceFinding)?input.sourceFinding:{},
  history:[]
 };
 action.history.push(eventFor(action,'created',now,input.actor||'system',{title:action.title,priority:action.priority,dueDate:action.dueDate}));
 return action;
}
function actorName(input){return typeof input.actor==='string'&&input.actor.trim()?input.actor.trim():null;}
function applyEvent(action,event,now){
 if(!obj(event))throw new Error('Each event must be an object');
 const type=event.type,actor=actorName(event);
 if(!actor)throw new Error(`Actor is required for event '${type||'unknown'}'`);
 const details=obj(event.details)?event.details:{};
 const append=(t,d={})=>action.history.push(eventFor(action,t,now,actor,d));
 if(type==='assign'){
  if(!['proposed','ineffective','reopened'].includes(action.status))throw new Error(`Cannot assign action in status '${action.status}'`);
  if(typeof event.owner!=='string'||!event.owner.trim())throw new Error('assign requires a non-empty owner');
  action.owner=event.owner.trim();if(event.ownerRole)action.ownerRole=String(event.ownerRole);
  action.status='assigned';append('assigned',{owner:action.owner,ownerRole:action.ownerRole});return;
 }
 if(type==='start'){
  if(!TRANSITIONS[action.status]||!TRANSITIONS[action.status].has('in_progress'))throw new Error(`Cannot start action in status '${action.status}'`);
  action.status='in_progress';append('started');return;
 }
 if(type==='add_evidence'){
  if(!['assigned','in_progress','pending_verification','ineffective','reopened'].includes(action.status))throw new Error(`Cannot add evidence in status '${action.status}'`);
  if(typeof event.description!=='string'||!event.description.trim())throw new Error('add_evidence requires a description');
  const item={evidenceId:`EVD-${hash(JSON.stringify({actionId:action.actionId,description:event.description.trim(),at:now,seq:action.evidence.length})).slice(0,12).toUpperCase()}`,
   description:event.description.trim(),reference:typeof event.reference==='string'?event.reference:null,
   capturedAt:now,capturedBy:actor,kind:event.kind||'general'};
  action.evidence.push(item);append('evidence_added',{evidenceId:item.evidenceId,description:item.description,reference:item.reference,kind:item.kind});return;
 }
 if(type==='submit_verification'){
  if(action.status!=='in_progress')throw new Error(`Cannot submit verification in status '${action.status}'`);
  if(action.evidence.length===0)throw new Error('At least one evidence item is required before verification');
  action.status='pending_verification';action.verification={submittedAt:now,submittedBy:actor,reviewer:null,reviewedAt:null,outcome:'pending',notes:''};
  append('verification_submitted',{evidenceCount:action.evidence.length});return;
 }
 if(type==='verify_effective'||type==='verify_ineffective'){
  if(action.status!=='pending_verification')throw new Error(`Cannot verify action in status '${action.status}'`);
  if(typeof event.notes!=='string'||!event.notes.trim())throw new Error('Verification requires non-empty notes');
  if(event.reviewer&&event.reviewer===action.verification.submittedBy)throw new Error('Reviewer must differ from the person submitting verification');
  const reviewer=event.reviewer||actor;
  if(reviewer===action.verification.submittedBy)throw new Error('Independent verification required: reviewer cannot be the submitter');
  const effective=type==='verify_effective';
  action.verification={...action.verification,reviewer,reviewedAt:now,outcome:effective?'effective':'ineffective',notes:event.notes.trim()};
  action.effectiveness={effective,checkedAt:now,checkedBy:reviewer,notes:event.notes.trim()};
  action.status=effective?'verified_effective':'ineffective';
  append(effective?'verified_effective':'verified_ineffective',{reviewer,notes:event.notes.trim()});return;
 }
 if(type==='reopen'){
  if(action.status!=='verified_effective'&&action.status!=='ineffective')throw new Error(`Cannot reopen action in status '${action.status}'`);
  if(typeof event.reason!=='string'||!event.reason.trim())throw new Error('reopen requires a reason');
  action.status='reopened';action.reopenCount++;action.verification=null;action.effectiveness=null;
  append('reopened',{reason:event.reason.trim(),reopenCount:action.reopenCount});return;
 }
 if(type==='cancel'){
  if(!TRANSITIONS[action.status]||!TRANSITIONS[action.status].has('cancelled'))throw new Error(`Cannot cancel action in status '${action.status}'`);
  if(typeof event.reason!=='string'||!event.reason.trim())throw new Error('cancel requires a reason');
  action.status='cancelled';append('cancelled',{reason:event.reason.trim()});return;
 }
 throw new Error(`Unsupported event type '${type}'`);
}
function run(input,options={}){
 if(!obj(input))throw new Error('Input must be a JSON object');
 const now=dateOnly(options.now||input.generatedAt||new Date().toISOString().slice(0,10),'generatedAt');
 if(!Array.isArray(input.actions))throw new Error('actions must be an array');
 const actions=[],seen=new Set();
 for(const item of input.actions){
  if(!obj(item))throw new Error('Each action must be an object');
  let action;
  if(item.history!==undefined){
   // Imported ledger snapshots are validated conservatively; events are applied to a reconstructed base.
   if(typeof item.actionId!=='string'||!item.actionId.trim()||typeof item.title!=='string'||!item.title.trim())throw new Error('Imported action snapshot requires actionId and title');
   if(!Array.isArray(item.history)||!Array.isArray(item.evidence))throw new Error('Imported action snapshot requires history and evidence arrays');
   action={...item,evidence:item.evidence.slice(),history:item.history.slice()};
   if(!TRANSITIONS[action.status]&&!['verified_effective','ineffective','reopened'].includes(action.status))throw new Error(`Invalid imported status '${action.status}'`);
   if(!action.history.length)throw new Error(`Imported action '${action.actionId}' must have history`);
  } else action=createAction(item,now);
  if(seen.has(action.actionId))throw new Error(`Duplicate actionId '${action.actionId}'`);
  seen.add(action.actionId);
  const events=item.events===undefined?[]:item.events;
  if(!Array.isArray(events))throw new Error(`events for '${action.actionId}' must be an array`);
  for(const event of events){
   const eventDate=dateOnly(event.at||now,'event.at');
   if(eventDate<now)throw new Error('Event date cannot be earlier than run date in this offline engine');
   applyEvent(action,{...event},eventDate);
  }
  actions.push(action);
 }
 const statusCounts={proposed:0,assigned:0,in_progress:0,pending_verification:0,verified_effective:0,ineffective:0,reopened:0,cancelled:0,overdue:0};
 for(const a of actions){
  if(statusCounts[a.status]!==undefined)statusCounts[a.status]++;
  if(!['verified_effective','cancelled'].includes(a.status)&&a.dueDate<now)statusCounts.overdue++;
 }
 const open=actions.filter(a=>!['verified_effective','cancelled'].includes(a.status));
 return {
  reportType:'forestos.corrective-action-lifecycle',version:1,mode:'offline_event_ledger',generatedAt:now,
  summary:{totalActions:actions.length,openActions:open.length,verifiedEffective:statusCounts.verified_effective,ineffective:statusCounts.ineffective,reopened:statusCounts.reopened,overdue:statusCounts.overdue,statusCounts},
  actions,
  governance:{eventHistoryIncluded:true,independentVerificationRequired:true,completionRequiresEvidence:true,automaticExecution:false,
   note:'This offline ledger is only as trustworthy as its input and operators. Keep immutable backups and restrict write access in production. Verification is an explicit human event; no external system is changed.'}
 };
}
function parseArgs(argv){
 const out={};for(const arg of argv){const m=arg.match(/^--([^=]+)=(.*)$/);if(!m)throw new Error(`Invalid argument '${arg}'. Use --input=path [--output=path] [--now=YYYY-MM-DD]`);out[m[1]]=m[2];}
 if(!out.input)throw new Error('Missing required --input=path');for(const k of Object.keys(out))if(!['input','output','now'].includes(k))throw new Error(`Unknown argument --${k}`);
 if(out.now)dateOnly(out.now,'now');return out;
}
if(require.main===module){try{const args=parseArgs(process.argv.slice(2));const input=JSON.parse(fs.readFileSync(path.resolve(args.input),'utf8'));const report=run(input,{now:args.now});const s=JSON.stringify(report,null,2)+'\n';if(args.output)fs.writeFileSync(path.resolve(args.output),s);else process.stdout.write(s);}catch(e){console.error(`ForestOS Phase 149 error: ${e.message}`);process.exitCode=1;}}
module.exports={run,createAction,applyEvent,parseArgs,dateOnly,addDays: (s,n)=>{const d=new Date(`${s}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);},TRANSITIONS};
