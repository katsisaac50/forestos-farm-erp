#!/usr/bin/env node
"use strict";
const fs=require("fs"), path=require("path");
const CS=new Set(["open","in_progress","pending_verification","closed","cancelled"]);
const AS=new Set(["open","in_progress","blocked","completed","cancelled"]);
const SV=new Set(["low","medium","high","critical"]);
function date(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s}
function str(s){return typeof s==="string"&&s.trim().length>0}
function list(x){return Array.isArray(x)?x:[]}
function bad(s){throw Error(s)}
function validate(input){
 if(!input||typeof input!=="object"||Array.isArray(input))bad("Input must be a JSON object.");
 if(!Array.isArray(input.cases))bad("'cases' must be an array.");
 const errors=[], ids=new Set(), aids=new Set();
 input.cases.forEach((c,i)=>{
  const p=`cases[${i}]`; if(!c||typeof c!=="object"||Array.isArray(c)){errors.push(`${p} must be an object`);return}
  if(!str(c.id))errors.push(`${p}.id is required`);else if(ids.has(c.id))errors.push(`${p}.id duplicates ${c.id}`);else ids.add(c.id);
  for(const k of ["sourceType","sourceId","area","problem","owner"])if(!str(c[k]))errors.push(`${p}.${k} is required`);
  if(!SV.has(c.severity))errors.push(`${p}.severity must be low, medium, high, or critical`);
  if(!CS.has(c.status))errors.push(`${p}.status is invalid`);
  for(const k of ["openedDate","dueDate"])if(!date(c[k]))errors.push(`${p}.${k} must be a valid YYYY-MM-DD date`);
  if(c.rootCause!=null&&typeof c.rootCause!=="string")errors.push(`${p}.rootCause must be a string`);
  if(c.repeatIssue!==undefined&&typeof c.repeatIssue!=="boolean")errors.push(`${p}.repeatIssue must be boolean`);
  for(const g of ["correctiveActions","preventiveActions"]){
   if(c[g]!==undefined&&!Array.isArray(c[g])){errors.push(`${p}.${g} must be an array`);continue}
   list(c[g]).forEach((a,j)=>{const q=`${p}.${g}[${j}]`;if(!a||typeof a!=="object"||Array.isArray(a)){errors.push(`${q} must be an object`);return}
    if(!str(a.id))errors.push(`${q}.id is required`);else if(aids.has(a.id))errors.push(`${q}.id duplicates ${a.id}`);else aids.add(a.id);
    for(const k of ["title","owner"])if(!str(a[k]))errors.push(`${q}.${k} is required`);
    if(!AS.has(a.status))errors.push(`${q}.status is invalid`);if(!date(a.dueDate))errors.push(`${q}.dueDate must be a valid YYYY-MM-DD date`);
    if(a.evidence!==undefined&&(!Array.isArray(a.evidence)||a.evidence.some(x=>!str(x))))errors.push(`${q}.evidence must be an array of non-empty references`);
   });
  }
  if(c.effectivenessReview!=null){const r=c.effectivenessReview,q=`${p}.effectivenessReview`;if(typeof r!=="object"||Array.isArray(r))errors.push(`${q} must be an object`);else{
   if(!date(r.reviewDate))errors.push(`${q}.reviewDate must be a valid YYYY-MM-DD date`);
   if(typeof r.effective!=="boolean")errors.push(`${q}.effective must be boolean`);if(!str(r.reviewer))errors.push(`${q}.reviewer is required`);
   if(r.notes!==undefined&&typeof r.notes!=="string")errors.push(`${q}.notes must be a string`);
  }}
 });
 if(errors.length)bad("Input validation failed:\n- "+errors.join("\n- "));return input.cases;
}
function summarize(input,now){
 if(!date(now))bad("--now must be a valid YYYY-MM-DD date.");const cases=validate(input);
 const live=cases.filter(c=>!["closed","cancelled"].includes(c.status));
 const actions=cases.flatMap(c=>[...list(c.correctiveActions).map(a=>({...a,kind:"corrective",caseId:c.id})),...list(c.preventiveActions).map(a=>({...a,kind:"preventive",caseId:c.id}))]);
 const overdueCases=live.filter(c=>c.dueDate<now), overdueActions=actions.filter(a=>!["completed","cancelled"].includes(a.status)&&a.dueDate<now);
 const actionable=actions.filter(a=>a.status!=="cancelled"), done=actions.filter(a=>a.status==="completed").length;
 const reviews=cases.filter(c=>c.effectivenessReview&&c.effectivenessReview.reviewDate<=now), effective=reviews.filter(c=>c.effectivenessReview.effective).length;
 const escalations=[], recommendations=[];
 for(const c of cases){
  if(!["closed","cancelled"].includes(c.status)&&c.dueDate<now)escalations.push({type:"overdue_case",caseId:c.id,severity:c.severity,message:`CAPA ${c.id} is overdue.`});
  if(!["closed","cancelled"].includes(c.status)&&["high","critical"].includes(c.severity))escalations.push({type:"high_severity_open_case",caseId:c.id,severity:c.severity,message:`High-severity CAPA ${c.id} requires active oversight.`});
  if(c.repeatIssue===true)escalations.push({type:"repeat_issue",caseId:c.id,severity:c.severity,message:`CAPA ${c.id} is flagged as a repeat issue.`});
  for(const a of [...list(c.correctiveActions),...list(c.preventiveActions)]){
   if(a.status==="blocked")escalations.push({type:"blocked_action",caseId:c.id,actionId:a.id,severity:c.severity,message:`Action ${a.id} is blocked.`});
   if(!["completed","cancelled"].includes(a.status)&&a.dueDate<now)escalations.push({type:"overdue_action",caseId:c.id,actionId:a.id,severity:c.severity,message:`Action ${a.id} is overdue.`});
  }
  if(c.effectivenessReview&&c.effectivenessReview.reviewDate<=now&&!c.effectivenessReview.effective)escalations.push({type:"ineffective_review",caseId:c.id,severity:c.severity,message:`CAPA ${c.id} failed its effectiveness review; reassess root cause and actions.`});
  const all=[...list(c.correctiveActions),...list(c.preventiveActions)];
  if(c.status==="closed"&&(!str(c.rootCause)||!c.effectivenessReview||c.effectivenessReview.reviewDate>now||c.effectivenessReview.effective!==true||all.some(a=>!["completed","cancelled"].includes(a.status))))escalations.push({type:"closure_control_exception",caseId:c.id,severity:c.severity,message:`CAPA ${c.id} is closed but fails one or more closure controls.`});
 }
 if(overdueCases.length)recommendations.push("Review overdue CAPA cases with owners and agree recovery dates.");
 if(overdueActions.length)recommendations.push("Prioritize overdue actions and attach completion evidence.");
 if(actions.some(a=>a.status==="blocked"))recommendations.push("Remove blockers or escalate resource and dependency decisions.");
 if(live.some(c=>["high","critical"].includes(c.severity)))recommendations.push("Review high and critical open cases during the farm operations meeting.");
 if(cases.some(c=>c.repeatIssue===true))recommendations.push("Investigate repeat issues for systemic process or training failures.");
 if(reviews.some(c=>!c.effectivenessReview.effective))recommendations.push("Reassess root cause and actions for CAPAs that failed effectiveness review.");
 if(escalations.some(e=>e.type==="closure_control_exception"))recommendations.push("Audit closed CAPAs against root-cause, action-completion, and effectiveness-review requirements.");
 return {system:"ForestOS",phase:141,reportType:"capa_management",asOf:now,generatedAt:now+"T00:00:00.000Z",
  kpis:{totalCases:cases.length,openCases:cases.filter(c=>c.status==="open").length,inProgressCases:cases.filter(c=>c.status==="in_progress").length,pendingVerificationCases:cases.filter(c=>c.status==="pending_verification").length,closedCases:cases.filter(c=>c.status==="closed").length,cancelledCases:cases.filter(c=>c.status==="cancelled").length,overdueCases:overdueCases.length,highOrCriticalOpenCases:live.filter(c=>["high","critical"].includes(c.severity)).length,repeatIssueCases:cases.filter(c=>c.repeatIssue===true).length,totalActions:actions.length,correctiveActions:actions.filter(a=>a.kind==="corrective").length,preventiveActions:actions.filter(a=>a.kind==="preventive").length,completedActions:done,overdueActions:overdueActions.length,blockedActions:actions.filter(a=>a.status==="blocked").length,actionCompletionRatePercent:actionable.length?Math.round(done/actionable.length*10000)/100:0,effectivenessReviewsDueOrRecorded:reviews.length,effectiveReviews:effective,effectivenessRatePercent:reviews.length?Math.round(effective/reviews.length*10000)/100:0},
  escalations,recommendations,cases:cases.map(c=>({id:c.id,sourceType:c.sourceType,sourceId:c.sourceId,area:c.area,problem:c.problem,severity:c.severity,owner:c.owner,status:c.status,openedDate:c.openedDate,dueDate:c.dueDate,overdue:!["closed","cancelled"].includes(c.status)&&c.dueDate<now,rootCauseRecorded:str(c.rootCause),correctiveActions:list(c.correctiveActions).map(a=>({id:a.id,title:a.title,owner:a.owner,dueDate:a.dueDate,status:a.status,overdue:!["completed","cancelled"].includes(a.status)&&a.dueDate<now,evidenceCount:list(a.evidence).length})),preventiveActions:list(c.preventiveActions).map(a=>({id:a.id,title:a.title,owner:a.owner,dueDate:a.dueDate,status:a.status,overdue:!["completed","cancelled"].includes(a.status)&&a.dueDate<now,evidenceCount:list(a.evidence).length})),effectivenessReview:c.effectivenessReview||null}))};
}
function main(argv){const args=Object.fromEntries(argv.filter(x=>x.startsWith("--")).map(x=>{const i=x.indexOf("=");return i<0?[x.slice(2),"true"]:[x.slice(2,i),x.slice(i+1)]}));if(!args.input)bad("Usage: node scripts/phase141-capa-management.js --input=records.json [--output=report.json] [--now=YYYY-MM-DD]");const input=JSON.parse(fs.readFileSync(path.resolve(args.input),"utf8"));const output=JSON.stringify(summarize(input,args.now||new Date().toISOString().slice(0,10)),null,2)+"\n";if(args.output)fs.writeFileSync(path.resolve(args.output),output);else process.stdout.write(output)}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error("ForestOS Phase 141 error: "+e.message);process.exitCode=1}}
module.exports={summarize,validate,isDate:date};
