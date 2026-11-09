#!/usr/bin/env node
"use strict";
const assert = require("assert");
const { buildOperationsReport } = require("./phase140-farm-operations-inspections");
const sample = {
 inspections: [
  {id:"I-1",area:"Block A",date:"2026-10-27",inspector:"Field Lead",issueCount:2,severity:"high",followUpRequired:true,notes:"Mortality patch"},
  {id:"I-2",area:"Apiary",date:"2026-10-28",inspector:"Apiary Lead",issueCount:0,severity:"low",followUpRequired:false}
 ],
 tasks: [
  {id:"T-1",area:"Block A",type:"gap_replanting",title:"Replant mortality patch",owner:"Worker A",dueDate:"2026-10-20",priority:"high",status:"open"},
  {id:"T-2",area:"Apiary",type:"apiary_inspection",title:"Inspect hives",owner:"Worker B",dueDate:"2026-10-29",priority:"medium",status:"in_progress"},
  {id:"T-3",area:"Block B",type:"weeding",title:"Complete weeding",owner:"Worker C",dueDate:"2026-10-21",priority:"low",status:"completed",evidence:["checklist-2026-10-21"]},
  {id:"T-4",area:"Block C",type:"firebreak",title:"Clear firebreak",owner:"Worker D",dueDate:"2026-10-22",priority:"critical",status:"blocked"}
 ]
};
let passed=0;
function test(name,fn){try{fn();passed++;console.log(`PASS ${name}`)}catch(e){console.error(`FAIL ${name}: ${e.message}`);process.exitCode=1}}
test("valid report generated",()=>assert.strictEqual(buildOperationsReport(sample,{now:"2026-10-28T12:00:00Z"}).status,"ok"));
test("phase identifier",()=>assert.strictEqual(buildOperationsReport(sample).phase,140));
test("inspection count",()=>assert.strictEqual(buildOperationsReport(sample).summary.inspectionCount,2));
test("follow-up inspection count",()=>assert.strictEqual(buildOperationsReport(sample).summary.inspectionsWithFollowUp,1));
test("issue counts summed",()=>assert.strictEqual(buildOperationsReport(sample).summary.inspectionIssues,2));
test("task count",()=>assert.strictEqual(buildOperationsReport(sample).summary.taskCount,4));
test("open tasks exclude completed and cancelled",()=>assert.strictEqual(buildOperationsReport(sample).summary.openTasks,3));
test("completed task count",()=>assert.strictEqual(buildOperationsReport(sample).summary.completedTasks,1));
test("overdue tasks use supplied clock",()=>assert.strictEqual(buildOperationsReport(sample,{now:"2026-10-28T12:00:00Z"}).summary.overdueTasks,2));
test("blocked tasks counted",()=>assert.strictEqual(buildOperationsReport(sample).summary.blockedTasks,1));
test("high or critical open tasks counted",()=>assert.strictEqual(buildOperationsReport(sample).summary.highOrCriticalOpenTasks,2));
test("completion percentage calculated",()=>assert.strictEqual(buildOperationsReport(sample).summary.taskCompletionPct,25));
test("overdue tasks produce escalation",()=>assert(buildOperationsReport(sample,{now:"2026-10-28"}).escalations.some(e=>e.message.includes("overdue"))));
test("blocked task produces escalation",()=>assert(buildOperationsReport(sample).escalations.some(e=>e.message.includes("blocked"))));
test("inspection issue produces escalation",()=>assert(buildOperationsReport(sample).escalations.some(e=>e.sourceType==="inspection")));
test("overdue recommendation appears",()=>assert(buildOperationsReport(sample).recommendations.some(r=>r.action.includes("overdue"))));
test("empty arrays valid",()=>assert.strictEqual(buildOperationsReport({inspections:[],tasks:[]}).status,"ok"));
test("missing arrays default empty",()=>assert.strictEqual(buildOperationsReport({}).summary.taskCount,0));
test("non-array inspections rejected",()=>assert(buildOperationsReport({inspections:{},tasks:[]}).errors.some(e=>e.includes("inspections must be an array"))));
test("invalid inspection date rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.inspections[0].date="2026-02-30";assert(buildOperationsReport(x).errors.some(e=>e.includes("date must be")));});
test("missing inspection area rejected",()=>{const x=JSON.parse(JSON.stringify(sample));delete x.inspections[0].area;assert(buildOperationsReport(x).errors.some(e=>e.includes("area is required")));});
test("negative issue count rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.inspections[0].issueCount=-1;assert(buildOperationsReport(x).errors.some(e=>e.includes("issueCount")));});
test("invalid severity rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.inspections[0].severity="urgent";assert(buildOperationsReport(x).errors.some(e=>e.includes("severity must be")));});
test("missing task owner rejected",()=>{const x=JSON.parse(JSON.stringify(sample));delete x.tasks[0].owner;assert(buildOperationsReport(x).errors.some(e=>e.includes("owner is required")));});
test("invalid task type rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.tasks[0].type="unknown";assert(buildOperationsReport(x).errors.some(e=>e.includes("type is invalid")));});
test("invalid status rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.tasks[0].status="done";assert(buildOperationsReport(x).errors.some(e=>e.includes("status is invalid")));});
test("duplicate task ids rejected",()=>{const x=JSON.parse(JSON.stringify(sample));x.tasks[1].id="T-1";assert(buildOperationsReport(x).errors.some(e=>e.includes("Duplicate task id")));});
test("completed tasks not overdue",()=>{const r=buildOperationsReport(sample,{now:"2026-10-28"});assert(!r.tasks.find(t=>t.id==="T-3").overdue);});
test("completed task without evidence triggers recommendation",()=>{const x=JSON.parse(JSON.stringify(sample));x.tasks[2].evidence=[];assert(buildOperationsReport(x).recommendations.some(r=>r.action.includes("completion evidence")));});
test("limitations describe offline scope",()=>assert(buildOperationsReport(sample).limitations.some(s=>s.includes("does not store records"))));
console.log(`\nPhase 140 contract tests: ${passed}/30 passed`);
if(passed!==30)process.exitCode=1;
