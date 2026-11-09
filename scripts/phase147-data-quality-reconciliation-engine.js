#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 147 — Data Quality & Reconciliation Engine
 * Deterministic, offline reconciliation of source snapshots, metrics, dates and records.
 */
const fs = require('fs');
const path = require('path');

function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function dateOnly(s, label='date') {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${label} must use YYYY-MM-DD`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== s) throw new Error(`${label} must be a real date`);
  return s;
}
function dayAge(from, to) {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}
function reconcile(input, options={}) {
  if (!isObject(input)) throw new Error('Input must be a JSON object');
  const generatedAt = dateOnly(options.now || input.generatedAt || new Date().toISOString().slice(0,10), 'generatedAt');
  const staleAfterDays = input.staleAfterDays === undefined ? 14 : input.staleAfterDays;
  if (!Number.isInteger(staleAfterDays) || staleAfterDays < 0) throw new Error('staleAfterDays must be a non-negative integer');
  if (!Array.isArray(input.sources)) throw new Error('sources must be an array');
  const issues = [], sourceSummary = [], metricResults = [], seenNames = new Set();
  const severityWeight = { critical: 30, high: 20, medium: 10, low: 3 };
  function addIssue(code, severity, message, details={}) { issues.push({code,severity,message,...details}); }
  for (const [idx, source] of input.sources.entries()) {
    if (!isObject(source)) { addIssue('INVALID_SOURCE','high',`Source at index ${idx} must be an object`,{index:idx}); continue; }
    const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `source-${idx+1}`;
    if (seenNames.has(name)) addIssue('DUPLICATE_SOURCE_NAME','high',`Source name '${name}' appears more than once`,{source:name});
    seenNames.add(name);
    let asOf = null;
    try { if (source.asOf !== undefined) asOf = dateOnly(source.asOf, `sources[${idx}].asOf`); }
    catch(e) { addIssue('INVALID_SOURCE_DATE','high',e.message,{source:name}); }
    if (!asOf) addIssue('MISSING_SOURCE_DATE','medium',`Source '${name}' has no valid asOf date`,{source:name});
    else {
      const age = dayAge(asOf, generatedAt);
      if (age < 0) addIssue('FUTURE_SOURCE_DATE','high',`Source '${name}' is dated after the report date`,{source:name,asOf,generatedAt});
      else if (age > staleAfterDays) addIssue('STALE_SOURCE','medium',`Source '${name}' is ${age} days old (limit ${staleAfterDays})`,{source:name,asOf,ageDays:age});
    }
    if (!isObject(source.metrics)) addIssue('MISSING_METRICS','high',`Source '${name}' has no metrics object`,{source:name});
    sourceSummary.push({name,asOf,metricCount:isObject(source.metrics)?Object.keys(source.metrics).length:0});
  }
  const sourceByName = new Map();
  for (const s of input.sources) if (isObject(s) && typeof s.name === 'string' && !sourceByName.has(s.name.trim())) sourceByName.set(s.name.trim(),s);
  const rules = input.rules === undefined ? [] : input.rules;
  if (!Array.isArray(rules)) throw new Error('rules must be an array');
  const ruleNames = new Set();
  for (const [idx, rule] of rules.entries()) {
    if (!isObject(rule) || typeof rule.metric !== 'string' || !rule.metric.trim()) {
      addIssue('INVALID_RULE','high',`Rule at index ${idx} needs a metric name`,{index:idx}); continue;
    }
    const metric = rule.metric.trim();
    if (ruleNames.has(metric)) addIssue('DUPLICATE_METRIC_RULE','medium',`Metric '${metric}' has multiple rules`,{metric});
    ruleNames.add(metric);
    const names = rule.sources === undefined ? [...sourceByName.keys()] : rule.sources;
    if (!Array.isArray(names) || names.length === 0 || names.some(n=>typeof n !== 'string')) {
      addIssue('INVALID_RULE_SOURCES','high',`Rule '${metric}' must have a non-empty sources array`,{metric}); continue;
    }
    const tolerance = rule.tolerance === undefined ? 0 : rule.tolerance;
    if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) {
      addIssue('INVALID_TOLERANCE','high',`Rule '${metric}' tolerance must be finite and non-negative`,{metric}); continue;
    }
    const values = [], missing = [];
    for (const name of names) {
      const s = sourceByName.get(name);
      if (!s) { missing.push(name); addIssue('SOURCE_NOT_FOUND','high',`Rule '${metric}' references missing source '${name}'`,{metric,source:name}); continue; }
      const metrics = isObject(s.metrics) ? s.metrics : {};
      if (!Object.prototype.hasOwnProperty.call(metrics, metric) || metrics[metric] === null || metrics[metric] === undefined) {
        missing.push(name); continue;
      }
      const value = metrics[metric];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        addIssue('INVALID_METRIC_VALUE','high',`Metric '${metric}' from '${name}' must be a finite non-negative number`,{metric,source:name,value});
        continue;
      }
      values.push({source:name,value});
    }
    let status = 'match', spread = 0;
    if (values.length === 0) status = 'missing_metric';
    else if (values.length === 1) status = 'single_source';
    else {
      const nums = values.map(v=>v.value);
      spread = Math.max(...nums)-Math.min(...nums);
      status = spread <= tolerance ? 'match' : 'conflict';
      if (status === 'conflict') addIssue('METRIC_CONFLICT', ['critical','high','medium','low'].includes(rule.severity)?rule.severity:'high', `Metric '${metric}' differs across sources beyond tolerance ${tolerance}`, {metric,tolerance,spread,values});
    }
    if (missing.length) addIssue('MISSING_METRIC','medium',`Metric '${metric}' is missing from one or more configured sources`,{metric,sources:missing});
    metricResults.push({metric,status,tolerance,spread,values,missingSources:missing});
  }
  const records = input.records === undefined ? [] : input.records;
  if (!Array.isArray(records)) throw new Error('records must be an array');
  const seenRecordIds = new Set(), seenFingerprints = new Set();
  for (const [idx, record] of records.entries()) {
    if (!isObject(record)) { addIssue('INVALID_RECORD','high',`Record at index ${idx} must be an object`,{index:idx}); continue; }
    const source = typeof record.source === 'string' ? record.source : '';
    if (!source || !sourceByName.has(source)) addIssue('RECORD_SOURCE_UNKNOWN','medium',`Record at index ${idx} refers to an unknown source`,{index:idx,source});
    if (record.recordId !== undefined && record.recordId !== null && String(record.recordId).trim()) {
      const key = `${source}\u0000${String(record.recordId)}`;
      if (seenRecordIds.has(key)) addIssue('DUPLICATE_RECORD_ID','high',`Duplicate recordId '${record.recordId}' within source '${source}'`,{source,recordId:String(record.recordId),index:idx});
      else seenRecordIds.add(key);
    }
    if (record.fingerprint !== undefined && record.fingerprint !== null && String(record.fingerprint).trim()) {
      const key = `${source}\u0000${String(record.fingerprint)}`;
      if (seenFingerprints.has(key)) addIssue('DUPLICATE_FINGERPRINT','high',`Duplicate fingerprint within source '${source}'`,{source,fingerprint:String(record.fingerprint),index:idx});
      else seenFingerprints.add(key);
    }
  }
  const counts = {critical:0,high:0,medium:0,low:0};
  for (const issue of issues) counts[issue.severity] = (counts[issue.severity]||0)+1;
  const penalty = issues.reduce((sum,i)=>sum+(severityWeight[i.severity]||10),0);
  const score = Math.max(0,100-penalty);
  const blockingCodes = new Set(['INVALID_SOURCE','DUPLICATE_SOURCE_NAME','INVALID_SOURCE_DATE','FUTURE_SOURCE_DATE','MISSING_METRICS','INVALID_RULE','INVALID_RULE_SOURCES','INVALID_TOLERANCE','INVALID_METRIC_VALUE','METRIC_CONFLICT','SOURCE_NOT_FOUND','INVALID_RECORD','DUPLICATE_RECORD_ID','DUPLICATE_FINGERPRINT']);
  const blocked = issues.some(i=>i.severity==='critical'||blockingCodes.has(i.code));
  const status = blocked ? 'blocked' : issues.length ? 'review_required' : 'ready';
  return {
    reportType:'forestos.data-quality-reconciliation',
    version:1,
    mode:'offline_json_reconciliation',
    generatedAt,
    status,
    qualityScore:score,
    scoreMethod:'Heuristic: start at 100; subtract 30 per critical, 20 per high, 10 per medium, and 3 per low issue; floor at 0. Not a statistical confidence measure.',
    summary:{sourceCount:sourceSummary.length,metricRuleCount:metricResults.length,recordCount:records.length,issueCount:issues.length,issueCounts:counts,conflictCount:metricResults.filter(m=>m.status==='conflict').length,missingMetricCount:metricResults.filter(m=>m.status==='missing_metric').length},
    sources:sourceSummary,
    metrics:metricResults,
    issues
  };
}
function parseArgs(argv) {
  const out={}; for (const arg of argv) {
    const m=arg.match(/^--([^=]+)=(.*)$/); if (!m) throw new Error(`Invalid argument '${arg}'. Use --input=path [--output=path] [--now=YYYY-MM-DD]`);
    out[m[1]]=m[2];
  }
  if (!out.input) throw new Error('Missing required --input=path');
  for (const k of Object.keys(out)) if (!['input','output','now'].includes(k)) throw new Error(`Unknown argument --${k}`);
  if (out.now) dateOnly(out.now,'now');
  return out;
}
if (require.main === module) {
  try {
    const args=parseArgs(process.argv.slice(2));
    const inputPath=path.resolve(args.input);
    const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
    const report=reconcile(input,{now:args.now});
    const output=JSON.stringify(report,null,2)+'\n';
    if (args.output) fs.writeFileSync(path.resolve(args.output),output);
    else process.stdout.write(output);
    if (report.status==='blocked') process.exitCode=2;
  } catch(e) { console.error(`ForestOS Phase 147 error: ${e.message}`); process.exitCode=1; }
}
module.exports={reconcile,parseArgs,dateOnly,dayAge};
