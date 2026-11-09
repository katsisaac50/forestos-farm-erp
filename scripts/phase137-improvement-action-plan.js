#!/usr/bin/env node
"use strict";
/**
 * ForestOS Phase 137: Continuous Improvement Action Plan & Tracking.
 * Offline JSON evaluation only. No persistence, scheduling, assignment, or notifications.
 */
const fs=require("fs"), path=require("path");
const STATUSES=new Set(["PROPOSED","APPROVED","IN_PROGRESS","BLOCKED","COMPLETED","CANCELLED"]);
const PRIORITIES=new Set(["LOW","MEDIUM","HIGH","CRITICAL"]);
const REQUIRED=["actionId","title","sourceFinding","owner","priority","status","createdAt","dueAt","successMeasure"];
const nonEmpty=v=>typeof v==="string"&&v.trim().length>0;
const validDate=v=>typeof v==="string"&&!Number.isNaN(Date.parse(v));
function evaluate(input, nowValue) {
 const actions=Array.isArray(input)?input:input&&input.actions;
 const now=validDate(nowValue)?Date.parse(nowValue):Date.now();
 if(!Array.isArray(actions)) return {schemaVersion:1,phase:137,error:"Input must be an array or an object with an actions array.",summary:{totalActions:0,findings:1},findings:[{code:"INVALID_TOP_LEVEL",severity:"ERROR",message:"Expected an array or { actions: [...] }."}],actions:[]};
 const findings=[], seen=new Set(), normalized=[];
 const add=(code,severity,message,actionId=null)=>findings.push({code,severity,message,actionId});
 actions.forEach((a,i)=>{
  const id=a&&nonEmpty(a.actionId)?a.actionId.trim():`row-${i+1}`, before=findings.length;
  if(!a||typeof a!=="object"||Array.isArray(a)){add("INVALID_ACTION","ERROR",`Action at index ${i} must be an object.`,id);normalized.push({actionId:id,valid:false,status:null});return;}
  if(seen.has(id))add("DUPLICATE_ACTION_ID","ERROR",`Action ID '${id}' is duplicated.`,id); seen.add(id);
  for(const field of REQUIRED)if(a[field]===undefined||a[field]===null||(typeof a[field]==="string"&&!a[field].trim()))add("MISSING_FIELD","ERROR",`Required field '${field}' is missing.`,id);
  for(const field of ["actionId","title","sourceFinding","owner","successMeasure"])if(a[field]!==undefined&&!nonEmpty(a[field]))add("INVALID_FIELD","ERROR",`${field} must be a non-empty string.`,id);
  if(a.priority!==undefined&&!PRIORITIES.has(a.priority))add("INVALID_PRIORITY","ERROR",`priority must be one of ${[...PRIORITIES].join(", ")}.`,id);
  if(a.status!==undefined&&!STATUSES.has(a.status))add("INVALID_STATUS","ERROR",`status must be one of ${[...STATUSES].join(", ")}.`,id);
  if(a.createdAt!==undefined&&!validDate(a.createdAt))add("INVALID_CREATED_DATE","ERROR","createdAt must be a parseable date.",id);
  if(a.dueAt!==undefined&&!validDate(a.dueAt))add("INVALID_DUE_DATE","ERROR","dueAt must be a parseable date.",id);
  if(validDate(a.createdAt)&&validDate(a.dueAt)&&Date.parse(a.dueAt)<Date.parse(a.createdAt))add("DUE_BEFORE_CREATED","ERROR","dueAt cannot precede createdAt.",id);
  if(a.status==="COMPLETED"&&!nonEmpty(a.completionEvidence))add("COMPLETION_EVIDENCE_MISSING","ERROR","Completed actions require completionEvidence.",id);
  if(a.status==="COMPLETED"&&!validDate(a.completedAt))add("COMPLETION_DATE_MISSING","ERROR","Completed actions require a valid completedAt date.",id);
  if(a.status==="COMPLETED"&&validDate(a.completedAt)&&validDate(a.dueAt)&&Date.parse(a.completedAt)>Date.parse(a.dueAt))add("COMPLETED_LATE","MEDIUM","Action was completed after its due date.",id);
  if(a.status==="IN_PROGRESS"&&validDate(a.dueAt)&&Date.parse(a.dueAt)<now)add("OVERDUE_IN_PROGRESS","HIGH","In-progress action is past due.",id);
  if(a.status==="BLOCKED")add("BLOCKED_ACTION","HIGH","Action is blocked; document the dependency and recovery plan.",id);
  if(["PROPOSED","APPROVED"].includes(a.status)&&validDate(a.dueAt)&&Date.parse(a.dueAt)<now)add("OVERDUE_NOT_STARTED","HIGH","Action is past due but has not started.",id);
  if(a.priority==="CRITICAL"&&a.status!=="COMPLETED"&&a.status!=="CANCELLED")add("CRITICAL_ACTION_OPEN","HIGH","Critical action remains open; verify escalation and ownership.",id);
  if(a.status==="CANCELLED"&&!nonEmpty(a.cancellationReason))add("CANCELLATION_REASON_MISSING","MEDIUM","Cancelled action needs a documented cancellationReason.",id);
  if(a.status==="COMPLETED"&&a.effectivenessReviewId===undefined)add("EFFECTIVENESS_REVIEW_NOT_LINKED","MEDIUM","Completed action has no linked effectivenessReviewId.",id);
  if(a.status==="IN_PROGRESS"&&a.progressPercent!==undefined&&(!Number.isFinite(a.progressPercent)||a.progressPercent<0||a.progressPercent>99))add("INVALID_PROGRESS","ERROR","In-progress progressPercent must be between 0 and 99.",id);
  if(a.status==="COMPLETED"&&a.progressPercent!==undefined&&a.progressPercent!==100)add("COMPLETION_PROGRESS_MISMATCH","MEDIUM","Completed action should report progressPercent 100 when the field is supplied.",id);
  if(a.status==="IN_PROGRESS"&&a.progressPercent===undefined)add("PROGRESS_NOT_REPORTED","LOW","In-progress action has no progressPercent.",id);
  const item={actionId:id,status:STATUSES.has(a.status)?a.status:null,priority:PRIORITIES.has(a.priority)?a.priority:null,valid:!findings.slice(before).some(f=>f.severity==="ERROR")};
  normalized.push(item);
 });
 const count=s=>normalized.filter(a=>a.status===s).length;
 const summary={totalActions:normalized.length,validActions:normalized.filter(a=>a.valid).length,invalidActions:normalized.filter(a=>!a.valid).length,proposed:count("PROPOSED"),approved:count("APPROVED"),inProgress:count("IN_PROGRESS"),blocked:count("BLOCKED"),completed:count("COMPLETED"),cancelled:count("CANCELLED"),openCritical:normalized.filter(a=>a.priority==="CRITICAL"&&!["COMPLETED","CANCELLED"].includes(a.status)).length,findings:findings.length,errorFindings:findings.filter(f=>f.severity==="ERROR").length,highSeverityFindings:findings.filter(f=>f.severity==="HIGH").length};
 return {schemaVersion:1,phase:137,generatedAt:new Date(now).toISOString(),summary,findings,actions:normalized};
}
function main(){const args=process.argv.slice(2);if(args.includes("--help")||args.length<1){console.log("Usage: node scripts/phase137-improvement-action-plan.js <input.json> [output.json] [--now ISO_DATE]");process.exit(args.length<1&&!args.includes("--help")?2:0);}
 const nowIndex=args.indexOf("--now"), now=nowIndex>=0?args[nowIndex+1]:undefined, file=args[0];let data;
 try{data=JSON.parse(fs.readFileSync(path.resolve(file),"utf8"));}catch(e){console.error(`Unable to read/parse input JSON: ${e.message}`);process.exit(2);}
 const report=evaluate(data,now), outPath=args[1]&&args[1]!=="--now"?args[1]:null, rendered=JSON.stringify(report,null,2)+"\n";
 if(outPath)fs.writeFileSync(path.resolve(outPath),rendered,"utf8");else process.stdout.write(rendered);if(report.error)process.exitCode=1;
}
if(require.main===module)main();
module.exports={evaluate,STATUSES,PRIORITIES};
