#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path'), crypto=require('crypto');
function readJson(f){return JSON.parse(fs.readFileSync(f,'utf8'))}
function sha256(f){return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}
function isObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function add(a,severity,code,message,evidence=null){a.push({severity,code,message,evidence})}
const SEVERITIES=new Set(['SEV1','SEV2','SEV3','SEV4']), STATUSES=new Set(['OPEN','INVESTIGATING','CONTAINED','MONITORING','CLOSED']), ACTION_STATUSES=new Set(['OPEN','IN_PROGRESS','BLOCKED','COMPLETE','CANCELLED']);
function evaluate({incidentRegister,now=new Date().toISOString(),inputHashes={}}){
 const findings=[], incidents=Array.isArray(incidentRegister)?incidentRegister:null;
 if(!incidents)add(findings,'BLOCKER','REGISTER_INVALID','Incident register must be a JSON array.');
 const ids=new Set(), actionIds=new Set(), actionsOut=[], recurrence=new Map(), normalized=[];
 (incidents||[]).forEach((x,i)=>{
  if(!isObject(x)){add(findings,'BLOCKER','INCIDENT_INVALID',`Incident at index ${i} must be an object.`);return}
  for(const f of ['incidentId','title','reportedAt','severity','status','owner','rootCauseCategory'])if(typeof x[f]!=='string'||!x[f].trim())add(findings,'BLOCKER','INCIDENT_FIELD_MISSING',`Required field "${f}" is missing.`,{incident:x.incidentId||i,field:f});
  if(x.incidentId){if(ids.has(x.incidentId))add(findings,'BLOCKER','DUPLICATE_INCIDENT_ID',`Duplicate incident ID "${x.incidentId}".`);ids.add(x.incidentId)}
  if(x.severity&&!SEVERITIES.has(x.severity))add(findings,'BLOCKER','INVALID_SEVERITY',`Incident ${x.incidentId||i} severity is unsupported.`);
  if(x.status&&!STATUSES.has(x.status))add(findings,'BLOCKER','INVALID_INCIDENT_STATUS',`Incident ${x.incidentId||i} status is unsupported.`);
  if(x.reportedAt&&!Number.isFinite(Date.parse(x.reportedAt)))add(findings,'BLOCKER','INVALID_REPORTED_AT',`Incident ${x.incidentId||i} reportedAt is invalid.`);
  if(x.closedAt&&!Number.isFinite(Date.parse(x.closedAt)))add(findings,'BLOCKER','INVALID_CLOSED_AT',`Incident ${x.incidentId||i} closedAt is invalid.`);
  if(x.status==='CLOSED'&&!x.closedAt)add(findings,'BLOCKER','CLOSED_WITHOUT_TIMESTAMP',`Incident ${x.incidentId||i} is closed without closedAt.`);
  if(x.status==='CLOSED'&&x.closureApproved!==true)add(findings,'BLOCKER','CLOSED_WITHOUT_APPROVAL',`Incident ${x.incidentId||i} is closed without closure approval.`);
  if(x.severity==='SEV1'&&!['CLOSED','CONTAINED'].includes(x.status))add(findings,'WARNING','SEV1_NOT_CONTAINED',`SEV1 incident ${x.incidentId||i} is not contained or closed.`);
  const key=`${x.rootCauseCategory||'UNKNOWN'}::${x.service||'UNKNOWN'}`;recurrence.set(key,(recurrence.get(key)||0)+1);
  if(!Array.isArray(x.correctiveActions))add(findings,'BLOCKER','ACTIONS_NOT_ARRAY',`Incident ${x.incidentId||i} correctiveActions must be an array.`);
  const actions=Array.isArray(x.correctiveActions)?x.correctiveActions:[];
  const actionSummaries=[];
  actions.forEach((a,j)=>{
   if(!isObject(a)){add(findings,'BLOCKER','ACTION_INVALID',`Corrective action ${j} must be an object.`);return}
   for(const f of ['actionId','description','owner','dueDate','status'])if(typeof a[f]!=='string'||!a[f].trim())add(findings,'BLOCKER','ACTION_FIELD_MISSING',`Action ${j} missing "${f}".`,{incidentId:x.incidentId||i,field:f});
   if(a.actionId){if(actionIds.has(a.actionId))add(findings,'BLOCKER','DUPLICATE_ACTION_ID',`Duplicate action ID "${a.actionId}".`);actionIds.add(a.actionId)}
   if(a.status&&!ACTION_STATUSES.has(a.status))add(findings,'BLOCKER','INVALID_ACTION_STATUS',`Action ${a.actionId||j} status is unsupported.`);
   if(a.dueDate&&!Number.isFinite(Date.parse(a.dueDate)))add(findings,'BLOCKER','INVALID_ACTION_DUE_DATE',`Action ${a.actionId||j} dueDate is invalid.`);
   if(a.status==='COMPLETE'&&(typeof a.completionEvidence!=='string'||!a.completionEvidence.trim()))add(findings,'BLOCKER','COMPLETION_EVIDENCE_MISSING',`Completed action ${a.actionId||j} needs completion evidence.`);
   const overdue=!!(a.dueDate&&Number.isFinite(Date.parse(a.dueDate))&&Date.parse(a.dueDate)<Date.parse(now)&&!['COMPLETE','CANCELLED'].includes(a.status));
   if(overdue)add(findings,'WARNING','ACTION_OVERDUE',`Action ${a.actionId||j} is overdue.`,{incidentId:x.incidentId||i,dueDate:a.dueDate,owner:a.owner||null});
   if(a.status==='BLOCKED')add(findings,'WARNING','ACTION_BLOCKED',`Action ${a.actionId||j} is blocked.`,{owner:a.owner||null,blocker:a.blocker||null});
   actionsOut.push({incidentId:x.incidentId||null,...a,overdue});
   actionSummaries.push({actionId:a.actionId||null,status:a.status||null,owner:a.owner||null,dueDate:a.dueDate||null,overdue});
  });
  normalized.push({incidentId:x.incidentId||null,title:x.title||null,severity:x.severity||null,status:x.status||null,service:x.service||null,rootCauseCategory:x.rootCauseCategory||null,owner:x.owner||null,reportedAt:x.reportedAt||null,closedAt:x.closedAt||null,recurrenceKey:key,correctiveActions:actionSummaries});
 });
 const recurrenceGroups=[...recurrence.entries()].filter(([,count])=>count>1).map(([key,count])=>({key,count,reviewRequired:true}));
 for(const g of recurrenceGroups)add(findings,'WARNING','RECURRENCE_PATTERN',`Multiple incidents share root-cause category and service (${g.key}). Review for recurrence.`,g);
 const blockers=findings.filter(f=>f.severity==='BLOCKER').length,warnings=findings.filter(f=>f.severity==='WARNING').length;
 return {schemaVersion:1,phase:135,generatedAt:new Date().toISOString(),asOf:now,
  summary:{incidentCount:normalized.length,correctiveActionCount:actionsOut.length,openIncidentCount:normalized.filter(i=>i.status!=='CLOSED').length,overdueActionCount:actionsOut.filter(a=>a.overdue).length,blockerCount:blockers,warningCount:warnings},
  findings,incidents:normalized,correctiveActions:actionsOut,recurrenceGroups,
  closurePolicy:{requiresClosedAt:true,requiresClosureApproved:true,requiresCompletedActionEvidence:true,requiresHumanReview:true},inputHashes,
  limitations:['Offline JSON analysis only; no database persistence or notifications.','Recurrence grouping is a heuristic and requires human root-cause review.','Completion evidence is checked for presence only; authenticity and quality are not verified.','No assignments, escalations, or production actions are performed.']};
}
function main(){const args=process.argv.slice(2),get=f=>{const i=args.indexOf(f);return i>=0?args[i+1]:null},input=get('--register'),out=get('--out')||'phase135-incident-register-report.json',asOf=get('--as-of')||new Date().toISOString();
 if(!input){console.error('Usage: node phase135-incident-register-corrective-actions.js --register incidents.json [--as-of ISO_TIMESTAMP] [--out report.json]');process.exitCode=2;return}
 try{const report=evaluate({incidentRegister:readJson(input),now:asOf,inputHashes:{registerSha256:sha256(input)}});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,output:path.resolve(out)},null,2));if(report.summary.blockerCount>0)process.exitCode=1}catch(e){console.error(`Phase 135 failed: ${e.message}`);process.exitCode=2}
}
if(require.main===module)main();module.exports={evaluate};
