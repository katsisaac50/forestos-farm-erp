#!/usr/bin/env node
"use strict";
/** ForestOS Phase 142 — Farm Task Scheduling & Workforce Execution. Offline JSON engine. */
const fs=require("fs"),path=require("path");
const TASK_STATUS=new Set(["planned","assigned","in_progress","blocked","submitted","verified","returned","cancelled"]);
const PRIORITY=new Set(["low","medium","high","critical"]);
const TYPES=new Set(["planting","gap_replanting","weeding","pruning","firebreak","pest_disease","tree_survival_check","soil_water","apiary_inspection","hive_repair","harvest","capa_action","other"]);
function date(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s}
function str(s){return typeof s==="string"&&s.trim().length>0}
function arr(x){return Array.isArray(x)?x:[]}
function bad(s){throw Error(s)}
function validate(input){
 if(!input||typeof input!=="object"||Array.isArray(input))bad("Input must be a JSON object.");
 if(!Array.isArray(input.tasks))bad("'tasks' must be an array.");
 const errors=[],ids=new Set();
 input.tasks.forEach((t,i)=>{const p=`tasks[${i}]`;if(!t||typeof t!=="object"||Array.isArray(t)){errors.push(`${p} must be an object`);return}
  if(!str(t.id))errors.push(`${p}.id is required`);else if(ids.has(t.id))errors.push(`${p}.id duplicates ${t.id}`);else ids.add(t.id);
  for(const k of ["title","area","owner","createdBy"])if(!str(t[k]))errors.push(`${p}.${k} is required`);
  if(!TYPES.has(t.type))errors.push(`${p}.type is invalid`);
  if(!PRIORITY.has(t.priority))errors.push(`${p}.priority is invalid`);
  if(!TASK_STATUS.has(t.status))errors.push(`${p}.status is invalid`);
  for(const k of ["startDate","dueDate"])if(!date(t[k]))errors.push(`${p}.${k} must be a valid YYYY-MM-DD date`);
  if(t.dueDate<t.startDate)errors.push(`${p}.dueDate cannot be before startDate`);
  if(t.estimatedMinutes!==undefined&&(!Number.isFinite(t.estimatedMinutes)||t.estimatedMinutes<0))errors.push(`${p}.estimatedMinutes must be a non-negative finite number`);
  if(t.completedQuantity!==undefined&&(!Number.isFinite(t.completedQuantity)||t.completedQuantity<0))errors.push(`${p}.completedQuantity must be a non-negative finite number`);
  if(t.plannedQuantity!==undefined&&(!Number.isFinite(t.plannedQuantity)||t.plannedQuantity<0))errors.push(`${p}.plannedQuantity must be a non-negative finite number`);
  if(t.unit!==undefined&&!str(t.unit))errors.push(`${p}.unit must be a non-empty string`);
  if(t.evidence!==undefined&&(!Array.isArray(t.evidence)||t.evidence.some(x=>!str(x))))errors.push(`${p}.evidence must be an array of non-empty references`);
  if(t.status==="verified"&&t.verifiedBy!==undefined&&!str(t.verifiedBy))errors.push(`${p}.verifiedBy must be a non-empty string`);
  if(t.history!==undefined&&(!Array.isArray(t.history)||t.history.some(h=>!h||typeof h!=="object"||!str(h.event)||!date(h.date))))errors.push(`${p}.history must contain event/date records`);
 });
 if(errors.length)bad("Input validation failed:\n- "+errors.join("\n- "));
 return input.tasks;
}
function report(input,now){
 if(!date(now))bad("--now must be a valid YYYY-MM-DD date.");
 const tasks=validate(input),active=tasks.filter(t=>t.status!=="cancelled");
 const overdue=active.filter(t=>!["verified","cancelled"].includes(t.status)&&t.dueDate<now);
 const verified=tasks.filter(t=>t.status==="verified"),submitted=tasks.filter(t=>t.status==="submitted");
 const assigned=active.filter(t=>["assigned","in_progress","blocked","submitted"].includes(t.status));
 const minutes=active.reduce((s,t)=>s+(t.estimatedMinutes||0),0);
 const byStatus={},byArea={},byOwner={};
 for(const t of tasks){byStatus[t.status]=(byStatus[t.status]||0)+1;byArea[t.area]??={total:0,verified:0,overdue:0};byArea[t.area].total++;if(t.status==="verified")byArea[t.area].verified++;if(overdue.some(x=>x.id===t.id))byArea[t.area].overdue++;
  byOwner[t.owner]??={assigned:0,inProgress:0,blocked:0,submitted:0,verified:0,overdue:0,estimatedMinutes:0};
  const o=byOwner[t.owner];if(t.status!=="cancelled")o.assigned++;if(t.status==="in_progress")o.inProgress++;if(t.status==="blocked")o.blocked++;if(t.status==="submitted")o.submitted++;if(t.status==="verified")o.verified++;if(overdue.some(x=>x.id===t.id))o.overdue++;o.estimatedMinutes+=t.estimatedMinutes||0;
 }
 const escalations=[],recommendations=[];
 for(const t of tasks){
  if(t.status!=="cancelled"&&t.priority==="critical"&&!["verified"].includes(t.status))escalations.push({type:"critical_task",taskId:t.id,owner:t.owner,area:t.area,message:`Critical task ${t.id} requires priority attention.`});
  if(overdue.some(x=>x.id===t.id))escalations.push({type:"overdue_task",taskId:t.id,owner:t.owner,area:t.area,message:`Task ${t.id} is overdue.`});
  if(t.status==="blocked")escalations.push({type:"blocked_task",taskId:t.id,owner:t.owner,area:t.area,message:`Task ${t.id} is blocked; resolve the dependency or escalate.`});
  if(t.status==="returned")escalations.push({type:"returned_task",taskId:t.id,owner:t.owner,area:t.area,message:`Task ${t.id} was returned for correction.`});
  if(t.status==="verified"&&(!str(t.verifiedBy)||!date(t.verifiedDate)||t.verifiedDate>now))escalations.push({type:"verification_record_exception",taskId:t.id,message:`Verified task ${t.id} lacks a valid verifier/date on or before the report date.`});
  if(t.status==="verified"&&t.completedQuantity!==undefined&&t.plannedQuantity!==undefined&&t.completedQuantity<t.plannedQuantity)escalations.push({type:"quantity_shortfall",taskId:t.id,owner:t.owner,area:t.area,message:`Verified task ${t.id} records less quantity than planned.`});
 }
 if(overdue.length)recommendations.push("Review overdue tasks with owners and reset recovery commitments.");
 if(tasks.some(t=>t.status==="blocked"))recommendations.push("Resolve blockers before assigning additional dependent work.");
 if(tasks.some(t=>t.status==="returned"))recommendations.push("Review returned tasks with workers and clarify acceptance criteria.");
 if(tasks.some(t=>t.priority==="critical"&&!["verified","cancelled"].includes(t.status)))recommendations.push("Review critical tasks at the start of each field shift.");
 if(tasks.some(t=>t.status==="verified"&&(!str(t.verifiedBy)||!date(t.verifiedDate)||t.verifiedDate>now)))recommendations.push("Require verifier identity and a valid verification date for verified tasks.");
 return {system:"ForestOS",phase:142,reportType:"farm_task_scheduling_workforce_execution",asOf:now,generatedAt:now+"T00:00:00.000Z",
  kpis:{totalTasks:tasks.length,activeTasks:active.length,plannedTasks:tasks.filter(t=>t.status==="planned").length,assignedTasks:tasks.filter(t=>t.status==="assigned").length,inProgressTasks:tasks.filter(t=>t.status==="in_progress").length,blockedTasks:tasks.filter(t=>t.status==="blocked").length,submittedForReview:submitted.length,verifiedTasks:verified.length,returnedTasks:tasks.filter(t=>t.status==="returned").length,cancelledTasks:tasks.filter(t=>t.status==="cancelled").length,overdueTasks:overdue.length,criticalUnverifiedTasks:tasks.filter(t=>t.priority==="critical"&&!["verified","cancelled"].includes(t.status)).length,taskVerificationRatePercent:active.length?Math.round(verified.length/active.length*10000)/100:0,estimatedActiveMinutes:minutes,plannedQuantity:active.reduce((s,t)=>s+(t.plannedQuantity||0),0),completedQuantity:active.reduce((s,t)=>s+(t.completedQuantity||0),0)},
  byStatus,byArea,byOwner,escalations,recommendations,
  tasks:tasks.map(t=>({id:t.id,title:t.title,type:t.type,area:t.area,owner:t.owner,createdBy:t.createdBy,priority:t.priority,status:t.status,startDate:t.startDate,dueDate:t.dueDate,overdue:!["verified","cancelled"].includes(t.status)&&t.dueDate<now,estimatedMinutes:t.estimatedMinutes??null,plannedQuantity:t.plannedQuantity??null,completedQuantity:t.completedQuantity??null,unit:t.unit??null,evidenceCount:arr(t.evidence).length,verifiedBy:t.verifiedBy??null,verifiedDate:t.verifiedDate??null,linkedCapaId:t.linkedCapaId??null,history:arr(t.history)}))};
}
function main(argv){const args=Object.fromEntries(argv.filter(x=>x.startsWith("--")).map(x=>{const i=x.indexOf("=");return i<0?[x.slice(2),"true"]:[x.slice(2,i),x.slice(i+1)]}));if(!args.input)bad("Usage: node scripts/phase142-farm-task-execution.js --input=tasks.json [--output=report.json] [--now=YYYY-MM-DD]");const input=JSON.parse(fs.readFileSync(path.resolve(args.input),"utf8"));const out=JSON.stringify(report(input,args.now||new Date().toISOString().slice(0,10)),null,2)+"\n";if(args.output)fs.writeFileSync(path.resolve(args.output),out);else process.stdout.write(out)}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error("ForestOS Phase 142 error: "+e.message);process.exitCode=1}}
module.exports={report,validate,isDate:date};
