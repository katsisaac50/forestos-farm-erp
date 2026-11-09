#!/usr/bin/env node
"use strict";
const assert = require("assert");
const {buildReport,parseDate,sectionStatus} = require("./phase150-management-command-centre");
let passed=0;
function test(name,fn){try{fn();passed++;console.log("PASS "+name)}catch(e){console.error("FAIL "+name+"\n"+e.stack);process.exitCode=1}}
const base={generatedAt:"2026-10-29",businessName:"Demo Farm",sections:{
 forestry:{metrics:{treeCount:7000,plantedAcres:7,survivalRate:0.9,targetSurvivalRate:0.9},issues:[]},
 apiary:{metrics:{hives:10,activeColonies:1,targetActiveColonies:3},issues:[]},
 workforce:{metrics:{tasksDue:12,tasksCompleted:10,overdueTasks:2},issues:[]},
 inspections:{metrics:{openFindings:2,criticalFindings:1},issues:[{code:"FIRE_RISK",priority:"critical",message:"Inspect storage area"}]},
 dataQuality:{status:"review_required",issues:[{code:"STALE_SOURCE",priority:"medium",message:"Source snapshot is stale"}]},
 correctiveActions:{actions:[{actionId:"CAPA-1",status:"in_progress",priority:"high",dueDate:"2026-10-28",title:"Repair fence"}]},
 decisionActions:{actions:[{actionId:"DEC-1",status:"proposed",priority:"medium",dueDate:"2026-11-05",title:"Approve apiary expansion"}]}
}};
test("critical issues trigger urgent attention",()=>assert.equal(buildReport(base).businessHealth,"urgent_attention"));
test("report schema version",()=>assert.equal(buildReport(base).schemaVersion,"150.1"));
test("report type",()=>assert.equal(buildReport(base).reportType,"management_command_centre"));
test("generated date copied",()=>assert.equal(buildReport(base).generatedAt,"2026-10-29"));
test("business name copied",()=>assert.equal(buildReport(base).businessName,"Demo Farm"));
test("tree count preserved",()=>assert.equal(buildReport(base).kpiSnapshot.forestry.treeCount,7000));
test("planted acres preserved",()=>assert.equal(buildReport(base).kpiSnapshot.forestry.plantedAcres,7));
test("survival target preserved",()=>assert.equal(buildReport(base).kpiSnapshot.forestry.targetSurvivalRate,0.9));
test("missing metrics not synthesized",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).kpiSnapshot.forestry,null));
test("missing section is not_provided",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).scorecards.apiary.status,"not_provided"));
test("missing sections count",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).counts.sectionsMissing,6));
test("supplied sections count",()=>assert.equal(buildReport(base).counts.sectionsSupplied,7));
test("critical count",()=>assert.equal(buildReport(base).counts.criticalOpen,1));
test("overdue action count",()=>assert.equal(buildReport(base).counts.correctiveActionsOverdue,1));
test("open corrective action count",()=>assert.equal(buildReport(base).counts.correctiveActionsOpen,1));
test("open decision count",()=>assert.equal(buildReport(base).counts.decisionActionsOpen,1));
test("urgent summary",()=>assert.match(buildReport(base).executiveSummary,/Immediate management review/));
test("critical issue sorts first",()=>assert.equal(buildReport(base).topPriorities[0].id,"FIRE_RISK"));
test("issue register has section issue",()=>assert(buildReport(base).issueRegister.some(x=>x.id==="FIRE_RISK")));
test("recommendations include critical exposure",()=>assert(buildReport(base).recommendations.some(x=>x.priority==="critical")));
test("recommendations include data coverage when missing",()=>assert(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).recommendations.some(x=>/coverage/.test(x.title))));
test("missing sections named",()=>assert(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).provenance.missingSections.includes("apiary")));
test("live connectors false",()=>assert.equal(buildReport(base).provenance.liveConnectors,false));
test("generated from input only",()=>assert.equal(buildReport(base).provenance.generatedFromProvidedInputOnly,true));
test("all supplied clean data on track",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]},apiary:{issues:[]},workforce:{issues:[]},inspections:{issues:[]},dataQuality:{issues:[]},correctiveActions:{actions:[]},decisionActions:{actions:[]}}}).businessHealth,"on_track"));
test("all supplied clean data on track",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]},apiary:{issues:[]},workforce:{issues:[]},inspections:{issues:[]},dataQuality:{issues:[]},correctiveActions:{actions:[]},decisionActions:{actions:[]}}}).businessHealth,"on_track"));
test("no sections insufficient data",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{}}).businessHealth,"insufficient_data"));
test("medium issue review required",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{code:"X",priority:"medium"}]}}}).businessHealth,"review_required"));
test("high issue review required",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{code:"X",priority:"high"}]}}}).businessHealth,"review_required"));
test("section blocked triggers urgent",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{status:"blocked",issues:[]}}}).businessHealth,"urgent_attention"));
test("section urgent triggers urgent",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{status:"urgent_attention",issues:[]}}}).businessHealth,"urgent_attention"));
test("section review status retained",()=>assert.equal(sectionStatus({status:"review_required",issues:[]}),"review_required"));
test("section absent status",()=>assert.equal(sectionStatus(null),"not_provided"));
test("critical issue normalization",()=>assert.equal(buildReport(base).issueRegister.find(x=>x.id==="FIRE_RISK").priority,"critical"));
test("issue fallback ID deterministic",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{}]}}}).issueRegister[0].id,"FORESTRY-1"));
test("issue fallback title",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{}]}}}).issueRegister[0].title,"Review operational issue"));
test("unknown priority defaults medium",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{priority:"banana"}]}}}).issueRegister[0].priority,"medium"));
test("overdue status uses UTC date comparison",()=>assert.equal(buildReport(base).issueRegister.find(x=>x.id==="CAPA-1").overdue,true));
test("due today not overdue",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{id:"x",dueDate:"2026-10-29"}]}}}).issueRegister[0].overdue,false));
test("future due date not overdue",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{id:"x",dueDate:"2026-10-30"}]}}}).issueRegister[0].overdue,false));
test("closed verified action not overdue",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{id:"x",status:"verified_effective",dueDate:"2026-10-01"}]}}}).issueRegister[0].overdue,false));
test("cancelled action not overdue",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{id:"x",status:"cancelled",dueDate:"2026-10-01"}]}}}).issueRegister[0].overdue,false));
test("ineffective action remains overdue when past due",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{id:"x",status:"ineffective",dueDate:"2026-10-01"}]}}}).issueRegister[0].overdue,true));
test("reopened action remains open",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{id:"x",status:"reopened"}]}}}).counts.correctiveActionsOpen,1));
test("decision proposals count open",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{decisionActions:{actions:[{id:"x",status:"proposed"}]}}}).counts.decisionActionsOpen,1));
test("approved decision is closed",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{decisionActions:{actions:[{id:"x",status:"approved"}]}}}).counts.decisionActionsOpen,0));
test("decision recommendation retained",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{decisionActions:{actions:[{id:"x",recommendation:"Review cost"}]}}}).issueRegister[0].recommendation,"Review cost"));
test("priority ordering critical before high",()=>{const r=buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{id:"h",priority:"high"},{id:"c",priority:"critical"}]}}});assert.equal(r.issueRegister[0].id,"c")});
test("overdue breaks tie after priority",()=>{const r=buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{id:"future",priority:"high",dueDate:"2026-10-30"},{id:"late",priority:"high",dueDate:"2026-10-01"}]}}});assert.equal(r.issueRegister[0].id,"late")});
test("top priorities limited to ten",()=>{const issues=Array.from({length:14},(_,i)=>({id:"i"+i,priority:"low"}));assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues}}}).topPriorities.length,10)});
test("stable output deterministic",()=>assert.deepStrictEqual(buildReport(base),buildReport(base)));
test("input object not mutated",()=>{const x=JSON.parse(JSON.stringify(base));buildReport(x);assert.deepStrictEqual(x,base)});
test("date parser accepts leap date",()=>assert.equal(parseDate("2024-02-29","date"),"2024-02-29"));
test("date parser rejects impossible date",()=>assert.throws(()=>parseDate("2026-02-30","date"),/valid calendar date/));
test("date parser rejects wrong format",()=>assert.throws(()=>parseDate("29-10-2026","date"),/YYYY-MM-DD/));
test("missing generated date rejected",()=>assert.throws(()=>buildReport({sections:{}}),/YYYY-MM-DD/));
test("array input rejected",()=>assert.throws(()=>buildReport([]),/JSON object/));
test("missing sections object rejected",()=>assert.throws(()=>buildReport({generatedAt:"2026-10-29"}),/sections must be/));
test("invalid issue date rejected",()=>assert.throws(()=>buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{dueDate:"not-a-date"}]}}}),/YYYY-MM-DD/));
test("invalid CAPA date rejected",()=>assert.throws(()=>buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{dueDate:"2026-02-30"}]}}}),/valid calendar date/));
test("invalid decision date rejected",()=>assert.throws(()=>buildReport({generatedAt:"2026-10-29",sections:{decisionActions:{actions:[{dueDate:"2026-02-30"}]}}}),/valid calendar date/));
test("missing action title fallback",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{}]}}}).issueRegister[0].title,"Corrective action needs review"));
test("active status case normalized",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{correctiveActions:{actions:[{status:"REOPENED"}]}}}).counts.correctiveActionsOpen,1));
test("clean partial report flags missing data coverage",()=>assert(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).recommendations.some(x=>/coverage/.test(x.title))));
test("stale source flagged in section",()=>assert.equal(buildReport(base).scorecards.dataQuality.status,"review_required"));
test("forestry section status on track",()=>assert.equal(buildReport(base).scorecards.forestry.status,"on_track"));
test("section metrics null when absent",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).scorecards.forestry.metrics,null));
test("overdue count includes non-CAPA issues",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{inspections:{issues:[{id:"i",dueDate:"2026-10-01"}]}}}).counts.overdueItems,1));
test("overdue total includes CAPA",()=>assert(buildReport(base).counts.overdueItems>=1));
test("risk recommendations mention CAPA overdue",()=>assert(buildReport(base).recommendations.some(x=>/overdue corrective/.test(x.title))));
test("decision count missing remains null",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).counts.decisionActionsOpen,null));
test("CAPA count missing remains null",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).counts.correctiveActionsOpen,null));
test("priority records include recommendation",()=>assert(typeof buildReport(base).topPriorities[0].recommendation==="string"));
test("business default name",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[]}}}).businessName,"ForestOS"));
test("cancelled issues excluded from top priorities",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{forestry:{issues:[{id:"x",status:"cancelled"}]}}}).topPriorities.length,0));
test("approved decision excluded from top priorities",()=>assert.equal(buildReport({generatedAt:"2026-10-29",sections:{decisionActions:{actions:[{id:"x",status:"approved"}]}}}).topPriorities.length,0));
console.log(`\nPhase 150 contract tests: ${passed} passed`);
if(process.exitCode)process.exit(process.exitCode);
