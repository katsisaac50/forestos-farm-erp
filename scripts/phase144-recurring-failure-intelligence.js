#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ACTION_STATES=new Set(['open','in_progress','implemented','verification_pending','effective','ineffective','closed','cancelled']);
const SEVERITIES=new Set(['low','medium','high','critical']);
const SOURCES=new Set(['inspection','task_verification','capa','incident','other']);
function isDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
function nonempty(s){return typeof s==='string'&&s.trim().length>0}
function list(x){return Array.isArray(x)?x:[]}
function analyze(input,now,threshold=2){
 const errors=[],warnings=[],alerts=[],items=list(input&&input.failures),actions=list(input&&input.actions);
 if(!input||!Array.isArray(input.failures))errors.push({code:'failures_required',message:'Input must contain a failures array.'});
 if(input&&input.actions!==undefined&&!Array.isArray(input.actions))errors.push({code:'actions_must_be_array',message:'actions must be an array.'});
 if(!isDate(now))errors.push({code:'invalid_now',message:'--now must be a real YYYY-MM-DD date.'});
 if(!Number.isInteger(threshold)||threshold<2)errors.push({code:'invalid_threshold',message:'--threshold must be an integer >= 2.'});
 const ids=new Set(),actionIds=new Set(),bySignature=new Map(),byArea=new Map(),byType=new Map();
 let overdueActions=0,openActions=0,ineffectiveActions=0,verifiedEffective=0,criticalOpen=0;
 for(const f of items){
  if(!f||typeof f!=='object'||Array.isArray(f)){errors.push({code:'invalid_failure',message:'Each failure must be an object.'});continue}
  const err=(code,message)=>errors.push({code,id:f.id,message});
  if(!nonempty(f.id))err('failure_id_required','Failure id is required.');
  else if(ids.has(f.id))err('duplicate_failure_id','Failure IDs must be unique.');
  else ids.add(f.id);
  if(!nonempty(f.title))err('failure_title_required','Failure title is required.');
  if(!nonempty(f.signature))err('failure_signature_required','signature is required to group recurring failures.');
  if(!nonempty(f.area))err('failure_area_required','area is required.');
  if(!nonempty(f.type))err('failure_type_required','type is required.');
  if(!SEVERITIES.has(f.severity))err('invalid_severity','severity must be low, medium, high, or critical.');
  if(!SOURCES.has(f.source))err('invalid_source','source must be inspection, task_verification, capa, incident, or other.');
  if(!isDate(f.date))err('invalid_failure_date','date must be a real YYYY-MM-DD date.');
  if(f.date&&isDate(now)&&isDate(f.date)&&f.date>now)warnings.push({code:'future_failure_date',id:f.id,message:'Failure date is in the future.'});
  if(f.capaId!==undefined&&f.capaId!==null&&!nonempty(f.capaId))err('invalid_capa_id','capaId must be non-empty when supplied.');
  const key=[f.signature,f.area].join('::');
  if(nonempty(f.signature)&&nonempty(f.area)){
   if(!bySignature.has(key))bySignature.set(key,[]);
   bySignature.get(key).push(f);
  }
  if(nonempty(f.area))byArea.set(f.area,(byArea.get(f.area)||0)+1);
  if(nonempty(f.type))byType.set(f.type,(byType.get(f.type)||0)+1);
 }
 const recurring=[];
 for(const [key,fs] of bySignature.entries()){
  if(fs.length>=threshold){
   const sorted=[...fs].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
   const sevRank={low:1,medium:2,high:3,critical:4};
   const highest=sorted.reduce((s,f)=>Math.max(s,sevRank[f.severity]||0),0);
   const obj={signature:sorted[0].signature,area:sorted[0].area,count:fs.length,firstSeen:sorted[0].date,lastSeen:sorted[sorted.length-1].date,highestSeverity:Object.keys(sevRank).find(k=>sevRank[k]===highest)||'unknown',failureIds:sorted.map(f=>f.id),linkedCapaIds:[...new Set(sorted.map(f=>f.capaId).filter(Boolean))]};
   recurring.push(obj);
   alerts.push({code:'recurring_failure',severity:highest>=4?'critical':highest>=3?'high':'medium',...obj,message:`Failure "${obj.signature}" occurred ${obj.count} times in ${obj.area}.`});
  }
 }
 for(const a of actions){
  if(!a||typeof a!=='object'||Array.isArray(a)){errors.push({code:'invalid_action',message:'Each corrective action must be an object.'});continue}
  const err=(code,message)=>errors.push({code,id:a.id,message});
  if(!nonempty(a.id))err('action_id_required','Action id is required.');
  else if(actionIds.has(a.id))err('duplicate_action_id','Action IDs must be unique.');
  else actionIds.add(a.id);
  if(!nonempty(a.title))err('action_title_required','Action title is required.');
  if(!ACTION_STATES.has(a.status))err('invalid_action_status','Invalid corrective action status.');
  if(!isDate(a.dueDate))err('invalid_action_due_date','dueDate must be a real YYYY-MM-DD date.');
  if(a.failureIds!==undefined&&!Array.isArray(a.failureIds))err('invalid_failure_ids','failureIds must be an array.');
  if(['open','in_progress','implemented','verification_pending','ineffective'].includes(a.status))openActions++;
  if(!['effective','closed','cancelled'].includes(a.status)&&isDate(a.dueDate)&&isDate(now)&&a.dueDate<now){overdueActions++;alerts.push({code:'overdue_corrective_action',severity:a.severity==='critical'?'critical':'high',id:a.id,title:a.title,dueDate:a.dueDate,status:a.status,message:`Corrective action "${a.title}" is overdue.`})}
  if(a.status==='ineffective'){ineffectiveActions++;alerts.push({code:'ineffective_corrective_action',severity:a.severity==='critical'?'critical':'high',id:a.id,title:a.title,message:'Effectiveness check failed; corrective action needs a revised plan.'})}
  if(a.status==='effective')verifiedEffective++;
  if(a.status==='open'&&a.severity==='critical')criticalOpen++;
  if(a.status==='effective'&&(!nonempty(a.verifiedBy)||!isDate(a.verifiedDate)))errors.push({code:'effectiveness_verification_required',id:a.id,message:'Effective status requires verifiedBy and verifiedDate.'});
  if(a.status==='closed'&&!['effective'].includes(a.priorStatus||''))warnings.push({code:'closed_without_effective_status',id:a.id,message:'Closed action has no priorStatus=effective; confirm closure policy.'});
 }
 const areaRanking=[...byArea.entries()].map(([area,count])=>({area,count})).sort((a,b)=>b.count-a.count||a.area.localeCompare(b.area));
 const typeRanking=[...byType.entries()].map(([type,count])=>({type,count})).sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type));
 const report={phase:144,generatedAt:now,recurrenceThreshold:threshold,summary:{failureCount:items.length,actionCount:actions.length,recurringPatterns:recurring.length,recurringFailureEvents:recurring.reduce((n,r)=>n+r.count,0),overdueActions,openActions,ineffectiveActions,effectiveActions:verifiedEffective,criticalOpenActions:criticalOpen,errorCount:errors.length,warningCount:warnings.length,alertCount:alerts.length},recurringPatterns:recurring,areaRanking,typeRanking,alerts,errors,warnings};
 return report;
}
function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return i<0?[a.replace(/^--/,''),true]:[a.slice(2,i),a.slice(i+1)]}));if(!args.input){console.error('Usage: node phase144-recurring-failure-intelligence.js --input=dataset.json [--output=report.json] [--now=YYYY-MM-DD] [--threshold=2]');process.exit(2)}try{const data=JSON.parse(fs.readFileSync(path.resolve(args.input),'utf8'));const r=analyze(data,args.now||new Date().toISOString().slice(0,10),args.threshold===undefined?2:Number(args.threshold));const out=JSON.stringify(r,null,2);if(args.output)fs.writeFileSync(path.resolve(args.output),out+'\n');else console.log(out);if(r.summary.errorCount)process.exitCode=1}catch(e){console.error('Phase 144 failed: '+e.message);process.exit(2)}}
if(require.main===module)main();module.exports={analyze,isDate};
