#!/usr/bin/env node
"use strict";
/**
 * ForestOS Phase 138 — Management KPI Analytics.
 * Offline, deterministic JSON report generator. No persistence or external calls.
 */
const fs=require("fs"),path=require("path");
const num=v=>typeof v==="number"&&Number.isFinite(v);
const nonEmpty=v=>typeof v==="string"&&v.trim().length>0;
const date=v=>typeof v==="string"&&!Number.isNaN(Date.parse(v));
function evaluate(input, nowValue) {
 const now=date(nowValue)?Date.parse(nowValue):Date.now();
 const datasets=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const findings=[];
 const add=(code,severity,message,area="general")=>findings.push({code,severity,message,area});
 const incidents=Array.isArray(datasets.incidents)?datasets.incidents:[];
 const actions=Array.isArray(datasets.actions)?datasets.actions:[];
 const reviews=Array.isArray(datasets.reviews)?datasets.reviews:[];
 const ops=Array.isArray(datasets.operations)?datasets.operations:[];
 if(!input||typeof input!=="object"||Array.isArray(input)) add("INVALID_INPUT","ERROR","Input must be a JSON object with optional incidents, actions, reviews, and operations arrays.");
 for(const key of ["incidents","actions","reviews","operations"]) if(datasets[key]!==undefined&&!Array.isArray(datasets[key]))add("INVALID_DATASET","ERROR",`${key} must be an array.`,key);
 const overdueActions=actions.filter(a=>a&&typeof a==="object"&&["PROPOSED","APPROVED","IN_PROGRESS","BLOCKED"].includes(a.status)&&date(a.dueAt)&&Date.parse(a.dueAt)<now);
 const openActions=actions.filter(a=>a&&typeof a==="object"&&!["COMPLETED","CANCELLED"].includes(a.status));
 const blockedActions=actions.filter(a=>a&&a.status==="BLOCKED");
 const criticalOpen=actions.filter(a=>a&&a.priority==="CRITICAL"&&!["COMPLETED","CANCELLED"].includes(a.status));
 const completedActions=actions.filter(a=>a&&a.status==="COMPLETED");
 const completionRate=actions.length?round(completedActions.length/actions.length*100):null;
 const incidentsOpen=incidents.filter(i=>i&&typeof i==="object"&&!["CLOSED","RESOLVED"].includes(i.status));
 const incidentsClosed=incidents.filter(i=>i&&typeof i==="object"&&["CLOSED","RESOLVED"].includes(i.status));
 const highSeverity=incidents.filter(i=>i&&["HIGH","CRITICAL","SEVERE"].includes(i.severity));
 const ineffective=reviews.filter(r=>r&&r.outcome==="INEFFECTIVE");
 const partial=reviews.filter(r=>r&&r.outcome==="PARTIALLY_EFFECTIVE");
 const inconclusive=reviews.filter(r=>r&&r.outcome==="INCONCLUSIVE");
 const repeatReviews=reviews.filter(r=>r&&r.repeatIncident===true);
 const effective=reviews.filter(r=>r&&r.outcome==="EFFECTIVE");
 const effectivenessRate=reviews.length?round(effective.length/reviews.length*100):null;
 const opValid=ops.filter(o=>o&&typeof o==="object");
 const opTotal=opValid.length;
 const opCompliant=opValid.filter(o=>o.compliant===true);
 const complianceRate=opTotal?round(opCompliant.length/opTotal*100):null;
 const areas={};
 for(const o of opValid){const area=nonEmpty(o.area)?o.area.trim():"Unspecified";if(!areas[area])areas[area]={records:0,compliant:0,nonCompliant:0};areas[area].records++;if(o.compliant===true)areas[area].compliant++;else if(o.compliant===false)areas[area].nonCompliant++;}
 for(const [area,v] of Object.entries(areas))v.complianceRate=v.records?round(v.compliant/v.records*100):null;
 if(criticalOpen.length)add("CRITICAL_ACTIONS_OPEN","HIGH",`${criticalOpen.length} critical improvement action(s) remain open.`,"actions");
 if(overdueActions.length)add("OVERDUE_ACTIONS","HIGH",`${overdueActions.length} open action(s) are past due.`,"actions");
 if(blockedActions.length)add("BLOCKED_ACTIONS","MEDIUM",`${blockedActions.length} action(s) are blocked.`,"actions");
 if(ineffective.length)add("INEFFECTIVE_ACTIONS","HIGH",`${ineffective.length} effectiveness review(s) judged an action ineffective.`,"reviews");
 if(repeatReviews.length)add("REPEAT_INCIDENTS_AFTER_ACTION","HIGH",`${repeatReviews.length} review(s) report repeat incidents after corrective action.`,"reviews");
 if(inconclusive.length)add("INCONCLUSIVE_REVIEWS","MEDIUM",`${inconclusive.length} effectiveness review(s) remain inconclusive.`,"reviews");
 const kpis={
  incidents:{total:incidents.length,open:incidentsOpen.length,closed:incidentsClosed.length,highSeverity:highSeverity.length,closureRate:incidents.length?round(incidentsClosed.length/incidents.length*100):null},
  actions:{total:actions.length,open:openActions.length,completed:completedActions.length,overdue:overdueActions.length,blocked:blockedActions.length,criticalOpen:criticalOpen.length,completionRatePercent:completionRate},
  effectiveness:{reviews:reviews.length,effective:effective.length,partiallyEffective:partial.length,ineffective:ineffective.length,inconclusive:inconclusive.length,repeatIncidents:repeatReviews.length,effectivenessRatePercent:effectivenessRate},
  operations:{records:opTotal,compliant:opCompliant.length,nonCompliant:opValid.filter(o=>o.compliant===false).length,complianceRatePercent:complianceRate,byArea:areas}
 };
 const recommendations=[];
 if(overdueActions.length)recommendations.push({priority:"HIGH",action:"Review overdue actions with their owners; agree a recovery date or escalate blockers."});
 if(criticalOpen.length)recommendations.push({priority:"HIGH",action:"Review each open critical action and document the escalation decision."});
 if(ineffective.length||repeatReviews.length)recommendations.push({priority:"HIGH",action:"Reassess root causes and controls for ineffective actions or repeat incidents."});
 if(blockedActions.length)recommendations.push({priority:"MEDIUM",action:"Record the dependency, decision owner, and unblock plan for each blocked action."});
 if(partial.length||inconclusive.length)recommendations.push({priority:"MEDIUM",action:"Schedule follow-up effectiveness reviews and define the evidence needed to decide."});
 if(!recommendations.length)recommendations.push({priority:"ROUTINE",action:"No rule-based priority flags were triggered; continue scheduled review and verify data quality."});
 return {schemaVersion:1,phase:138,generatedAt:new Date(now).toISOString(),dataQuality:{inputDatasets:{incidents:incidents.length,actions:actions.length,reviews:reviews.length,operations:ops.length},findings:findings.length,errorFindings:findings.filter(f=>f.severity==="ERROR").length},kpis,findings,recommendations,disclaimer:"KPI values are calculated only from supplied records. Missing datasets are treated as empty; rates are null when their denominator is zero. This report is a decision aid, not an audit opinion or verified operational record."};
}
function round(v){return Math.round((v+Number.EPSILON)*100)/100;}
function main(){const args=process.argv.slice(2);if(args.includes("--help")||args.length<1){console.log("Usage: node scripts/phase138-management-kpi-analytics.js <input.json> [output.json] [--now ISO_DATE]");process.exit(args.length<1&&!args.includes("--help")?2:0);}
 const idx=args.indexOf("--now"),now=idx>=0?args[idx+1]:undefined;let input;
 try{input=JSON.parse(fs.readFileSync(path.resolve(args[0]),"utf8"));}catch(e){console.error(`Unable to read/parse input JSON: ${e.message}`);process.exit(2);}
 const report=evaluate(input,now),outPath=args[1]&&args[1]!=="--now"?args[1]:null,rendered=JSON.stringify(report,null,2)+"\n";
 if(outPath)fs.writeFileSync(path.resolve(outPath),rendered,"utf8");else process.stdout.write(rendered);
 if(report.dataQuality.errorFindings)process.exitCode=1;
}
if(require.main===module)main();
module.exports={evaluate,round};
