#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 148 — Decision & Action Intelligence Engine
 * Offline deterministic triage of reconciliation/operations findings into proposed actions.
 * Recommendations are advisory; this tool does not assign people or execute actions.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function obj(v){return !!v && typeof v==='object' && !Array.isArray(v);}
function dateOnly(s,label='date'){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${label} must use YYYY-MM-DD`);
  const d=new Date(`${s}T00:00:00Z`);
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s) throw new Error(`${label} must be a real date`);
  return s;
}
function addDays(s,n){const d=new Date(`${s}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function sha(s){return crypto.createHash('sha256').update(s).digest('hex');}
const DEFAULTS={
  METRIC_CONFLICT:{priority:'critical',domain:'data_governance',title:'Reconcile conflicting metric',action:'Verify each source against the field definition and approved source of truth; document the corrected value and evidence.',days:1},
  INVALID_METRIC_VALUE:{priority:'high',domain:'data_governance',title:'Correct invalid metric value',action:'Inspect the source record, correct the value using verified evidence, and rerun validation.',days:2},
  DUPLICATE_RECORD_ID:{priority:'high',domain:'data_governance',title:'Investigate duplicate record identifier',action:'Compare the duplicate records, determine whether they are true duplicates, and document the resolution before removing or merging anything.',days:2},
  DUPLICATE_FINGERPRINT:{priority:'high',domain:'data_governance',title:'Investigate duplicate record fingerprint',action:'Review the records sharing a fingerprint and verify whether they represent the same underlying event.',days:2},
  STALE_SOURCE:{priority:'medium',domain:'data_governance',title:'Refresh stale source report',action:'Request or produce an updated report and confirm that its reporting period is aligned with the other sources.',days:5},
  MISSING_METRIC:{priority:'medium',domain:'data_governance',title:'Supply missing metric',action:'Locate the missing metric in the responsible source, record why it is absent if unavailable, and rerun reconciliation.',days:5},
  MISSING_SOURCE_DATE:{priority:'medium',domain:'data_governance',title:'Add source reporting date',action:'Confirm the report period and add a verified as-of date to the source metadata.',days:5},
  FUTURE_SOURCE_DATE:{priority:'high',domain:'data_governance',title:'Verify future-dated source',action:'Check the source clock, reporting period, and date conversion; correct metadata only after verification.',days:2},
  MISSING_METRICS:{priority:'high',domain:'data_governance',title:'Restore source metrics',action:'Check the source export and schema mapping, then provide the required metrics or document the export failure.',days:2},
  SOURCE_NOT_FOUND:{priority:'high',domain:'data_governance',title:'Resolve missing configured source',action:'Verify the source name and availability, correct the reconciliation rule or restore the intended source, then rerun.',days:2},
  DUPLICATE_SOURCE_NAME:{priority:'high',domain:'data_governance',title:'Resolve duplicate source names',action:'Give each distinct source a unique stable name and rerun reconciliation.',days:2},
  RECORD_SOURCE_UNKNOWN:{priority:'medium',domain:'data_governance',title:'Map record to a known source',action:'Verify the record origin and map it to a registered source before relying on the record.',days:5},
  INVALID_SOURCE_DATE:{priority:'high',domain:'data_governance',title:'Correct invalid source date',action:'Verify the original reporting date and correct the date format/value at source.',days:2},
  INVALID_RULE:{priority:'high',domain:'data_governance',title:'Correct reconciliation rule',action:'Review the rule definition and metric key with the data owner before rerunning.',days:2},
  INVALID_TOLERANCE:{priority:'high',domain:'data_governance',title:'Correct metric tolerance',action:'Confirm the units and approved tolerance for this metric, then update the rule.',days:2},
  INVALID_RECORD:{priority:'high',domain:'data_governance',title:'Repair invalid record structure',action:'Inspect the source export and restore the required record fields before rerunning.',days:2},
  RECURRING_FAILURE:{priority:'high',domain:'operations',title:'Investigate recurring operational failure',action:'Identify the repeat cause, assign an accountable owner, and define a corrective action with evidence of effectiveness.',days:3},
  OVERDUE_ACTION:{priority:'high',domain:'operations',title:'Review overdue corrective action',action:'Confirm the blocker, agree a revised completion date with the owner, and escalate if risk remains uncontrolled.',days:2},
  CRITICAL_UNVERIFIED:{priority:'critical',domain:'operations',title:'Verify critical work before sign-off',action:'Pause sign-off for the affected critical task, inspect the work, capture evidence, and obtain authorized verification.',days:0},
  HIGH_SEVERITY_INSPECTION:{priority:'critical',domain:'forestry_apiary_safety',title:'Triage high-severity inspection finding',action:'Assess immediate safety, environmental, livestock, apiary, and asset risks; apply safe interim controls and document an owner and due date.',days:0},
  LOW_SURVIVAL_RATE:{priority:'high',domain:'forestry',title:'Investigate low tree survival',action:'Sample affected planting areas, record mortality causes, check species/site/season and maintenance, and approve a targeted replanting plan.',days:5},
  LOW_COLONY_COUNT:{priority:'medium',domain:'apiary',title:'Inspect colony occupancy and health',action:'Inspect hive occupancy and colony health using safe beekeeping practice, record likely causes, and plan follow-up.',days:5},
  OVERDUE_TASKS:{priority:'medium',domain:'workforce',title:'Recover overdue task backlog',action:'Review overdue tasks with supervisors, identify blockers, reprioritise safely, and set realistic completion commitments.',days:3}
};
const RANK={critical:4,high:3,medium:2,low:1};
function classifyPriority(p){return Object.prototype.hasOwnProperty.call(RANK,p)?p:'medium';}
function buildAction(seed,now,overrides={}){
  const base=DEFAULTS[seed.code]||{priority:'medium',domain:'operations',title:`Review ${seed.code||'operational finding'}`,action:'Investigate the finding, record evidence, and agree an accountable owner and due date.',days:5};
  const priority=classifyPriority(overrides.priority||seed.priority||base.priority);
  const dueDays=Number.isInteger(overrides.dueDays)&&overrides.dueDays>=0?overrides.dueDays:base.days;
  const details={};
  for(const k of ['metric','source','sources','recordId','fingerprint','spread','tolerance','value','asOf','ageDays','index','message']) if(seed[k]!==undefined) details[k]=seed[k];
  const identity={code:seed.code||'GENERAL',details,title:overrides.title||base.title};
  const id='ACT-'+sha(JSON.stringify(identity)).slice(0,12).toUpperCase();
  return {
    actionId:id, findingCode:seed.code||'GENERAL', priority, priorityRank:RANK[priority],
    domain:overrides.domain||base.domain, title:overrides.title||base.title,
    recommendedAction:overrides.action||base.action, ownerRole:overrides.ownerRole||'Farm manager / designated data owner',
    dueDate:addDays(now,dueDays), status:'proposed', sourceFinding:details,
    evidenceRequired:['Record the investigation outcome','Attach supporting evidence','Record reviewer and review date'],
    escalation:priority==='critical'?'Escalate immediately to the responsible manager; do not mark resolved without verification.':
      priority==='high'?'Escalate to the responsible manager if the due date or risk control is missed.':'Review at the next scheduled operations review.'
  };
}
function generate(input,options={}){
  if(!obj(input)) throw new Error('Input must be a JSON object');
  const generatedAt=dateOnly(options.now||input.generatedAt||new Date().toISOString().slice(0,10),'generatedAt');
  const findings=[];
  const report=input.reconciliationReport;
  if(report!==undefined){
    if(!obj(report)) throw new Error('reconciliationReport must be an object');
    if(Array.isArray(report.issues)) for(const issue of report.issues) if(obj(issue)) findings.push({...issue,sourceType:'reconciliation'});
    if(report.status==='blocked'&&!findings.some(x=>x.code==='RECONCILIATION_BLOCKED')) findings.push({code:'RECONCILIATION_BLOCKED',severity:'critical',message:'Reconciliation report is blocked',sourceType:'reconciliation'});
  }
  if(input.findings!==undefined){
    if(!Array.isArray(input.findings)) throw new Error('findings must be an array');
    for(const f of input.findings){if(!obj(f)||typeof f.code!=='string'||!f.code.trim()) throw new Error('Each finding must be an object with a code');findings.push({...f,sourceType:f.sourceType||'manual'});}
  }
  if(input.metrics!==undefined){
    if(!obj(input.metrics)) throw new Error('metrics must be an object');
    const m=input.metrics;
    if(typeof m.overdueTasks==='number'&&m.overdueTasks>0) findings.push({code:'OVERDUE_TASKS',severity:'medium',message:`${m.overdueTasks} overdue tasks`,count:m.overdueTasks,sourceType:'metrics'});
    if(typeof m.criticalUnverified==='number'&&m.criticalUnverified>0) findings.push({code:'CRITICAL_UNVERIFIED',severity:'critical',message:`${m.criticalUnverified} critical tasks lack verification`,count:m.criticalUnverified,sourceType:'metrics'});
    if(typeof m.highSeverityInspectionIssues==='number'&&m.highSeverityInspectionIssues>0) findings.push({code:'HIGH_SEVERITY_INSPECTION',severity:'critical',message:`${m.highSeverityInspectionIssues} high-severity inspection findings`,count:m.highSeverityInspectionIssues,sourceType:'metrics'});
    if(typeof m.survivalRate==='number'&&typeof m.minimumSurvivalRate==='number'&&m.survivalRate<m.minimumSurvivalRate) findings.push({code:'LOW_SURVIVAL_RATE',severity:'high',message:`Survival rate ${m.survivalRate} is below configured minimum ${m.minimumSurvivalRate}`,value:m.survivalRate,sourceType:'metrics'});
    if(typeof m.activeColonies==='number'&&typeof m.minimumActiveColonies==='number'&&m.activeColonies<m.minimumActiveColonies) findings.push({code:'LOW_COLONY_COUNT',severity:'medium',message:`Active colonies ${m.activeColonies} are below configured minimum ${m.minimumActiveColonies}`,value:m.activeColonies,sourceType:'metrics'});
  }
  const templates=input.actionTemplates===undefined?{}:input.actionTemplates;
  if(!obj(templates)) throw new Error('actionTemplates must be an object keyed by finding code');
  const actions=[], unknown=[];
  for(const f of findings){
    const code=String(f.code||'GENERAL');
    const custom=obj(templates[code])?templates[code]:{};
    if(!DEFAULTS[code]&&!Object.keys(custom).length) unknown.push(code);
    const action=buildAction(f,generatedAt,custom);
    action.sourceFinding.sourceType=f.sourceType||'manual';
    if(f.count!==undefined) action.sourceFinding.count=f.count;
    actions.push(action);
  }
  // Deduplicate identical proposals while retaining deterministic order.
  const deduped=[],seen=new Set();
  for(const a of actions){if(!seen.has(a.actionId)){seen.add(a.actionId);deduped.push(a);}}
  deduped.sort((a,b)=>b.priorityRank-a.priorityRank||a.dueDate.localeCompare(b.dueDate)||a.actionId.localeCompare(b.actionId));
  const byPriority={critical:0,high:0,medium:0,low:0};
  for(const a of deduped) byPriority[a.priority]++;
  const blocked=(report&&report.status==='blocked')||deduped.some(a=>a.priority==='critical');
  return {
    reportType:'forestos.decision-action-intelligence',version:1,mode:'offline_advisory_recommendations',
    generatedAt,decisionStatus:blocked?'urgent_attention':deduped.length?'actions_recommended':'no_actions_required',
    summary:{findingsReceived:findings.length,actionsProposed:deduped.length,deduplicatedActions:actions.length-deduped.length,byPriority,unknownFindingCodes:[...new Set(unknown)].sort()},
    actions:deduped,
    governance:{advisoryOnly:true,automaticExecution:false,automaticAssignment:false,requiresHumanApproval:true,
      note:'Recommendations are not proof of a root cause. Authorized staff must verify findings, assign named owners, confirm safe controls, and approve any operational changes.'}
  };
}
function parseArgs(argv){
 const out={};for(const arg of argv){const m=arg.match(/^--([^=]+)=(.*)$/);if(!m)throw new Error(`Invalid argument '${arg}'. Use --input=path [--output=path] [--now=YYYY-MM-DD]`);out[m[1]]=m[2];}
 if(!out.input)throw new Error('Missing required --input=path');
 for(const k of Object.keys(out))if(!['input','output','now'].includes(k))throw new Error(`Unknown argument --${k}`);
 if(out.now)dateOnly(out.now,'now');return out;
}
if(require.main===module){
 try{const args=parseArgs(process.argv.slice(2));const input=JSON.parse(fs.readFileSync(path.resolve(args.input),'utf8'));const report=generate(input,{now:args.now});const text=JSON.stringify(report,null,2)+'\n';if(args.output)fs.writeFileSync(path.resolve(args.output),text);else process.stdout.write(text);if(report.decisionStatus==='urgent_attention')process.exitCode=2;}
 catch(e){console.error(`ForestOS Phase 148 error: ${e.message}`);process.exitCode=1;}
}
module.exports={generate,buildAction,parseArgs,dateOnly,addDays,DEFAULTS};
