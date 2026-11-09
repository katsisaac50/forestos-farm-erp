#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const OUTCOMES = new Set(["EFFECTIVE","PARTIALLY_EFFECTIVE","INEFFECTIVE","INCONCLUSIVE"]);
const REQUIRED = ["reviewId","incidentId","actionId","rootCause","intendedOutcome","preMetric","postMetric","evidenceReference","reviewer","reviewedAt","outcome"];
const nonEmpty = v => typeof v === "string" && v.trim().length > 0;
const isDate = v => typeof v === "string" && !Number.isNaN(Date.parse(v));
function metricValid(m) {
 return !!m && typeof m==="object" && !Array.isArray(m) && nonEmpty(m.name) &&
   typeof m.value==="number" && Number.isFinite(m.value) && (m.unit===undefined || typeof m.unit==="string");
}
function evaluate(input) {
 const reviews=Array.isArray(input)?input:input&&input.reviews;
 if(!Array.isArray(reviews)) return {schemaVersion:1,phase:136,error:"Input must be an array or an object with a reviews array.",summary:{totalReviews:0,validReviews:0,findings:1},findings:[{code:"INVALID_TOP_LEVEL",severity:"ERROR",message:"Expected an array or { reviews: [...] }."}],reviews:[]};
 const findings=[], seen=new Set(), byAction=new Map(), normalized=[];
 const add=(code,severity,message,reviewId=null)=>findings.push({code,severity,message,reviewId});
 reviews.forEach((r,index)=>{
  const id=r&&nonEmpty(r.reviewId)?r.reviewId.trim():`row-${index+1}`, before=findings.length;
  if(!r||typeof r!=="object"||Array.isArray(r)){add("INVALID_REVIEW","ERROR",`Review at index ${index} must be an object.`,id);normalized.push({reviewId:id,valid:false,outcome:null,actionId:null});return;}
  if(seen.has(id))add("DUPLICATE_REVIEW_ID","ERROR",`Review ID '${id}' is duplicated.`,id); seen.add(id);
  for(const field of REQUIRED) if(r[field]===undefined||r[field]===null||(typeof r[field]==="string"&&!r[field].trim())) add("MISSING_FIELD","ERROR",`Required field '${field}' is missing.`,id);
  for(const field of ["reviewId","incidentId","actionId","rootCause","intendedOutcome","evidenceReference","reviewer"]) if(r[field]!==undefined&&r[field]!==null&&!nonEmpty(r[field]))add("INVALID_FIELD","ERROR",`Field '${field}' must be a non-empty string.`,id);
  if(r.preMetric!==undefined&&!metricValid(r.preMetric))add("INVALID_PRE_METRIC","ERROR","preMetric must include a name and finite numeric value.",id);
  if(r.postMetric!==undefined&&!metricValid(r.postMetric))add("INVALID_POST_METRIC","ERROR","postMetric must include a name and finite numeric value.",id);
  if(metricValid(r.preMetric)&&metricValid(r.postMetric)&&r.preMetric.name!==r.postMetric.name)add("METRIC_MISMATCH","ERROR","Pre- and post-metrics must measure the same named indicator.",id);
  if(r.reviewedAt!==undefined&&!isDate(r.reviewedAt))add("INVALID_REVIEW_DATE","ERROR","reviewedAt must be a parseable date.",id);
  if(r.incidentAt!==undefined&&!isDate(r.incidentAt))add("INVALID_INCIDENT_DATE","ERROR","incidentAt must be a parseable date when supplied.",id);
  if(isDate(r.reviewedAt)&&isDate(r.incidentAt)&&Date.parse(r.reviewedAt)<Date.parse(r.incidentAt))add("REVIEW_PRECEDES_INCIDENT","ERROR","Review date cannot precede the incident date.",id);
  if(r.outcome!==undefined&&!OUTCOMES.has(r.outcome))add("INVALID_OUTCOME","ERROR",`Outcome must be one of ${[...OUTCOMES].join(", ")}.`,id);
  if(r.outcome==="INEFFECTIVE")add("INEFFECTIVE_ACTION_FOLLOW_UP","HIGH","Action was judged ineffective; create or link a follow-up corrective action.",id);
  if(r.outcome==="PARTIALLY_EFFECTIVE")add("PARTIAL_EFFECTIVENESS_REVIEW","MEDIUM","Partial effectiveness requires a documented residual-risk decision or further action.",id);
  if(r.outcome==="INCONCLUSIVE")add("INCONCLUSIVE_REVIEW","MEDIUM","Effectiveness is inconclusive; obtain stronger evidence or schedule another review.",id);
  if(r.repeatIncident===true)add("REPEAT_INCIDENT_AFTER_ACTION","HIGH","A repeat incident was reported after the corrective action; reassess root cause and controls.",id);
  if(r.repeatIncident!==undefined&&typeof r.repeatIncident!=="boolean")add("INVALID_REPEAT_INCIDENT_FLAG","ERROR","repeatIncident must be a boolean when supplied.",id);
  if(r.followUpActionId!==undefined&&r.followUpActionId!==null&&!nonEmpty(r.followUpActionId))add("INVALID_FOLLOW_UP_ID","ERROR","followUpActionId must be a non-empty string when supplied.",id);
  if(r.outcome==="INEFFECTIVE"&&!nonEmpty(r.followUpActionId))add("FOLLOW_UP_NOT_LINKED","HIGH","Ineffective outcome has no linked followUpActionId.",id);
  const item={reviewId:id,incidentId:nonEmpty(r.incidentId)?r.incidentId.trim():null,actionId:nonEmpty(r.actionId)?r.actionId.trim():null,outcome:OUTCOMES.has(r.outcome)?r.outcome:null,valid:!findings.slice(before).some(f=>f.severity==="ERROR")};
  normalized.push(item);
  if(item.actionId){if(!byAction.has(item.actionId))byAction.set(item.actionId,[]);byAction.get(item.actionId).push(item);}
 });
 for(const [actionId,rs] of byAction.entries())if(rs.some(x=>["INEFFECTIVE","PARTIALLY_EFFECTIVE","INCONCLUSIVE"].includes(x.outcome))&&rs.some(x=>x.outcome==="EFFECTIVE"))add("MIXED_ACTION_EFFECTIVENESS","MEDIUM",`Action '${actionId}' has mixed effectiveness outcomes across reviews; reconcile the evidence and review chronology.`);
 const count=o=>normalized.filter(r=>r.outcome===o).length;
 const summary={totalReviews:normalized.length,validReviews:normalized.filter(r=>r.valid).length,invalidReviews:normalized.filter(r=>!r.valid).length,effective:count("EFFECTIVE"),partiallyEffective:count("PARTIALLY_EFFECTIVE"),ineffective:count("INEFFECTIVE"),inconclusive:count("INCONCLUSIVE"),repeatIncidents:reviews.filter(r=>r&&r.repeatIncident===true).length,actionsReviewed:byAction.size,findings:findings.length,highSeverityFindings:findings.filter(f=>f.severity==="HIGH").length,errorFindings:findings.filter(f=>f.severity==="ERROR").length};
 return {schemaVersion:1,phase:136,generatedAt:new Date().toISOString(),summary,findings,reviews:normalized};
}
function main(){const args=process.argv.slice(2);if(args.includes("--help")||args.length<1){console.log("Usage: node scripts/phase136-corrective-action-effectiveness.js <input.json> [output.json]");process.exit(args.length<1&&!args.includes("--help")?2:0);}
 let input;try{input=JSON.parse(fs.readFileSync(path.resolve(args[0]),"utf8"));}catch(e){console.error(`Unable to read/parse input JSON: ${e.message}`);process.exit(2);}
 const report=evaluate(input), rendered=JSON.stringify(report,null,2)+"\n";if(args[1])fs.writeFileSync(path.resolve(args[1]),rendered,"utf8");else process.stdout.write(rendered);if(report.error)process.exitCode=1;}
if(require.main===module)main();module.exports={evaluate,OUTCOMES,metricValid};
