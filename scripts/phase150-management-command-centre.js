#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const PRIORITY = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const CLOSED_CAPA = new Set(["verified_effective", "cancelled"]);
const ACTIVE_ACTION = new Set(["proposed", "assigned", "in_progress", "pending_verification", "ineffective", "reopened"]);
function fail(message) { const e = new Error(message); e.name = "ValidationError"; throw e; }
function parseDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} must be YYYY-MM-DD`);
  const d = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== value) fail(`${label} is not a valid calendar date`);
  return value;
}
function asArray(v) { return Array.isArray(v) ? v : []; }
function priorityOf(v) { const p = String(v || "medium").toLowerCase(); return Object.prototype.hasOwnProperty.call(PRIORITY,p) ? p : "medium"; }
function safeText(v, fallback) { return typeof v === "string" && v.trim() ? v.trim() : fallback; }
function sectionStatus(section) {
  if (!section || typeof section !== "object") return "not_provided";
  if (section.status && ["blocked","urgent_attention","review_required","on_track","not_provided","insufficient_data"].includes(section.status)) return section.status;
  const issues = asArray(section.issues);
  if (issues.some(x => priorityOf(x.priority) === "critical")) return "urgent_attention";
  if (issues.some(x => ["high","medium"].includes(priorityOf(x.priority)))) return "review_required";
  if (section.status === "stale" || section.status === "review_required") return "review_required";
  return "on_track";
}
function normalizeIssue(issue, sectionName, idx, now) {
  const due = issue && issue.dueDate ? parseDate(issue.dueDate, `${sectionName}.issues[${idx}].dueDate`) : null;
  return {
    id: safeText(issue && (issue.id || issue.actionId || issue.code), `${sectionName.toUpperCase()}-${idx+1}`),
    section: sectionName,
    title: safeText(issue && (issue.title || issue.message || issue.code), "Review operational issue"),
    priority: priorityOf(issue && issue.priority),
    dueDate: due,
    overdue: Boolean(due && due < now && !["verified_effective","cancelled","completed","closed"].includes(String(issue.status || "").toLowerCase())),
    status: safeText(issue && issue.status, "open"),
    source: safeText(issue && issue.source, sectionName),
    recommendation: safeText(issue && issue.recommendation, "Assign an accountable owner, set a due date, and record closure evidence."),
    actionType: safeText(issue && issue.actionType, "review")
  };
}
function buildReport(input, options={}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Input must be a JSON object");
  const now = parseDate(options.now || input.generatedAt, "now/generatedAt");
  const sectionsInput = input.sections;
  if (!sectionsInput || typeof sectionsInput !== "object" || Array.isArray(sectionsInput)) fail("sections must be a JSON object");
  const names = ["forestry","apiary","workforce","inspections","dataQuality","correctiveActions","decisionActions"];
  const sections = {};
  const supplied = [], missing = [], allIssues = [], metrics = {};
  for (const name of names) {
    const s = sectionsInput[name];
    if (!s || typeof s !== "object" || Array.isArray(s)) { sections[name] = {status:"not_provided", supplied:false, metrics:null, issueCount:null}; missing.push(name); continue; }
    supplied.push(name);
    const issues = asArray(s.issues).map((x,i)=>normalizeIssue(x,name,i,now));
    sections[name] = {status:sectionStatus(s), supplied:true, metrics:(s.metrics && typeof s.metrics === "object" ? s.metrics : null), issueCount:issues.length};
    metrics[name] = sections[name].metrics;
    allIssues.push(...issues);
    if (name === "correctiveActions") {
      for (const [i,a] of asArray(s.actions).entries()) {
        const status = safeText(a && a.status, "proposed").toLowerCase();
        const dueDate = a && a.dueDate ? parseDate(a.dueDate, `correctiveActions.actions[${i}].dueDate`) : null;
        const closed = CLOSED_CAPA.has(status);
        allIssues.push({
          id:safeText(a && (a.actionId || a.id),`CAPA-${i+1}`), section:name,
          title:safeText(a && a.title,"Corrective action needs review"),
          priority:priorityOf(a && a.priority), dueDate,
          overdue:Boolean(dueDate && dueDate < now && !closed), status,
          source:"correctiveActions", recommendation:status==="ineffective" || status==="reopened" ? "Reassess root cause, revise the corrective action, and independently verify effectiveness." : "Confirm ownership, due date, evidence, and next review step.",
          actionType:"corrective_action"
        });
      }
    }
    if (name === "decisionActions") {
      for (const [i,a] of asArray(s.actions).entries()) {
        const status = safeText(a && a.status,"proposed").toLowerCase();
        const dueDate = a && a.dueDate ? parseDate(a.dueDate, `decisionActions.actions[${i}].dueDate`) : null;
        allIssues.push({
          id:safeText(a && (a.actionId || a.id),`DECISION-${i+1}`), section:name,
          title:safeText(a && a.title,"Management decision proposal"),
          priority:priorityOf(a && a.priority), dueDate,
          overdue:Boolean(dueDate && dueDate < now && !["completed","closed","cancelled","approved"].includes(status)), status,
          source:"decisionActions", recommendation:safeText(a && a.recommendation,"Review the proposal, name a decision owner, and record the decision and rationale."),
          actionType:"decision"
        });
      }
    }
  }
  const unique = new Map();
  for (const issue of allIssues) if (!unique.has(`${issue.section}:${issue.id}`)) unique.set(`${issue.section}:${issue.id}`, issue);
  const issues = [...unique.values()].sort((a,b)=>
    PRIORITY[a.priority]-PRIORITY[b.priority] ||
    Number(b.overdue)-Number(a.overdue) ||
    (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
    a.section.localeCompare(b.section) || a.id.localeCompare(b.id)
  );
  const criticalOpen = issues.filter(x=>x.priority==="critical" && !["verified_effective","cancelled","completed","closed"].includes(x.status)).length;
  const nonInfo = issues.filter(x=>["critical","high","medium"].includes(x.priority)).length;
  let businessHealth;
  if (!supplied.length) businessHealth = "insufficient_data";
  else if (criticalOpen > 0 || Object.values(sections).some(s=>s.status==="blocked" || s.status==="urgent_attention")) businessHealth = "urgent_attention";
  else if (nonInfo > 0 || missing.length > 0 || Object.values(sections).some(s=>s.status==="review_required")) businessHealth = "review_required";
  else businessHealth = "on_track";
  const capa = asArray(sectionsInput.correctiveActions && sectionsInput.correctiveActions.actions);
  const decision = asArray(sectionsInput.decisionActions && sectionsInput.decisionActions.actions);
  const capaOpen = capa.filter(a=>!CLOSED_CAPA.has(safeText(a && a.status,"proposed").toLowerCase())).length;
  const capaOverdue = issues.filter(x=>x.section==="correctiveActions" && x.overdue).length;
  const decisionOpen = decision.filter(a=>!["completed","closed","cancelled","approved","rejected"].includes(safeText(a && a.status,"proposed").toLowerCase())).length;
  const recommendations = [];
  if (missing.length) recommendations.push({priority:"high",title:"Complete management data coverage",detail:`Provide data for: ${missing.join(", ")}. Missing sections are unknown, not zero.`});
  if (criticalOpen) recommendations.push({priority:"critical",title:"Resolve critical operational exposure",detail:`${criticalOpen} critical open item(s) require accountable ownership and prompt review.`});
  if (capaOverdue) recommendations.push({priority:"high",title:"Review overdue corrective actions",detail:`${capaOverdue} corrective action(s) are past due; re-plan or escalate with evidence.`});
  if (decisionOpen) recommendations.push({priority:"medium",title:"Close the management decision loop",detail:`${decisionOpen} decision/action proposal(s) remain open; record owner, decision, and next step.`});
  if (!recommendations.length && businessHealth==="on_track") recommendations.push({priority:"low",title:"Maintain operating discipline",detail:"Continue routine reviews, verify source freshness, and record evidence for material decisions."});
  const topPriorities = issues.filter(x=>!["verified_effective","cancelled","completed","closed","approved","rejected"].includes(x.status)).slice(0,10);
  return {
    schemaVersion:"150.1",
    reportType:"management_command_centre",
    generatedAt:now,
    businessName:safeText(input.businessName,"ForestOS"),
    businessHealth,
    executiveSummary: businessHealth==="urgent_attention" ? "Immediate management review is required for critical or blocked operational exposure." :
      businessHealth==="review_required" ? "Management review is needed: open issues, missing sections, or review flags remain." :
      businessHealth==="insufficient_data" ? "There is not enough supplied information to assess operational health." :
      "Supplied sections show no critical or review-level issue in this report snapshot.",
    scorecards:sections,
    kpiSnapshot:metrics,
    counts:{
      sectionsSupplied:supplied.length, sectionsMissing:missing.length,
      issuesTracked:issues.length, criticalOpen,
      overdueItems:issues.filter(x=>x.overdue).length,
      correctiveActionsOpen:sectionsInput.correctiveActions ? capaOpen : null,
      correctiveActionsOverdue:sectionsInput.correctiveActions ? capaOverdue : null,
      decisionActionsOpen:sectionsInput.decisionActions ? decisionOpen : null
    },
    topPriorities,
    recommendations,
    issueRegister:issues,
    provenance:{
      inputMode:"local_json_snapshot",
      suppliedSections:supplied,
      missingSections:missing,
      liveConnectors:false,
      generatedFromProvidedInputOnly:true,
      note:"Missing metrics and sections are not treated as zero. No live system, database, or external source was queried."
    }
  };
}
function main(argv) {
  const args = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (!m) fail(`Invalid argument "${arg}". Use --input=FILE --output=FILE [--now=YYYY-MM-DD]`);
    args[m[1]]=m[2];
  }
  if (!args.input || !args.output) fail("Required arguments: --input=FILE --output=FILE [--now=YYYY-MM-DD]");
  const input = JSON.parse(fs.readFileSync(path.resolve(args.input),"utf8"));
  const report = buildReport(input,{now:args.now});
  fs.writeFileSync(path.resolve(args.output),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({ok:true,output:path.resolve(args.output),businessHealth:report.businessHealth,priorities:report.topPriorities.length,missingSections:report.counts.sectionsMissing}));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(`ForestOS Phase 150 error: ${e.message}`); process.exitCode=1; }
}
module.exports={buildReport,parseDate,sectionStatus};
