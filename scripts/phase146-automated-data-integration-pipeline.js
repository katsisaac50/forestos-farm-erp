#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 146 — Automated Data Integration Pipeline
 * Offline deterministic adapter: validates named source report files, maps them to
 * Phase 145 dashboard input schema, and records source lineage and data quality.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_MAP = {
  forestry: ['forestry', 'scorecards', 'forestryScorecard', 'forestryMetrics'],
  apiary: ['apiary', 'scorecards', 'apiaryScorecard', 'apiaryMetrics'],
  workforce: ['workforce', 'operations', 'taskSummary', 'workforceSummary'],
  inspections: ['inspections', 'inspectionSummary', 'farmInspections'],
  verification: ['verification', 'verificationSummary', 'supervisorVerification'],
  correctiveActions: ['correctiveActions', 'capa', 'capaSummary'],
  recurringFailures: ['recurringFailures', 'recurrence', 'recurringFailureSummary']
};
const ALIASES = {
  forestry: {
    treeCount: ['treeCount', 'trees', 'totalTrees', 'plantedTrees'],
    plantedAcres: ['plantedAcres', 'acres', 'plantedAreaAcres'],
    survivalRate: ['survivalRate', 'treeSurvivalRate', 'survivalRatio']
  },
  apiary: {
    hives: ['hives', 'hiveCount', 'totalHives'],
    activeColonies: ['activeColonies', 'colonies', 'occupiedHives'],
    honeyKg: ['honeyKg', 'harvestKg', 'honeyHarvestKg']
  },
  workforce: {
    total: ['total', 'totalTasks', 'taskCount'],
    completed: ['completed', 'completedTasks'],
    overdue: ['overdue', 'overdueTasks'],
    blocked: ['blocked', 'blockedTasks'],
    criticalUnverified: ['criticalUnverified', 'criticalUnverifiedTasks']
  },
  inspections: {
    total: ['total', 'inspectionCount', 'totalInspections'],
    issues: ['issues', 'issueCount', 'totalIssues'],
    highSeverity: ['highSeverity', 'highSeverityIssues', 'criticalIssues'],
    followUps: ['followUps', 'followUpCount']
  },
  verification: {
    submitted: ['submitted', 'submittedCount', 'recordsSubmitted'],
    approved: ['approved', 'approvedCount', 'recordsApproved'],
    returned: ['returned', 'returnedCount'],
    rejected: ['rejected', 'rejectedCount'],
    missingEvidence: ['missingEvidence', 'missingEvidenceCount'],
    failedChecklistItems: ['failedChecklistItems', 'failedItems'],
    quantityShortfalls: ['quantityShortfalls', 'shortfalls']
  },
  correctiveActions: {
    open: ['open', 'openActions'],
    overdue: ['overdue', 'overdueActions'],
    ineffective: ['ineffective', 'ineffectiveActions'],
    criticalOpen: ['criticalOpen', 'criticalOpenActions']
  },
  recurringFailures: { patterns: ['patterns', 'patternCount', 'recurringPatternCount'] }
};
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function parseDate(s) {
  if (s === undefined) return null;
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('now/generatedAt must use YYYY-MM-DD');
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== s) throw new Error('now/generatedAt must be a real date');
  return s;
}
function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function findObject(report, candidates) {
  for (const candidate of candidates) {
    if (isObject(report[candidate])) return { key: candidate, value: report[candidate] };
    if (candidate.includes('.')) {
      const v = candidate.split('.').reduce((a,k)=>a && a[k], report);
      if (isObject(v)) return { key: candidate, value: v };
    }
  }
  return null;
}
function firstValue(obj, aliases) {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined && obj[key] !== null) return { key, value: obj[key] };
  }
  return null;
}
function numeric(value, label, ratio = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite, non-negative number`);
  if (ratio && value > 1) throw new Error(`${label} must be between 0 and 1`);
  return value;
}
function getMetric(section, aliases, label, ratio, warnings) {
  const found = firstValue(section, aliases);
  if (!found) { warnings.push(`No supported source field found for ${label}; defaulted to 0`); return { value: 0, field: null }; }
  return { value: numeric(found.value, label, ratio), field: found.key };
}
function unwrap(report) {
  // Known reports sometimes wrap the actual metrics under "metrics", "summary", or "data".
  for (const key of ['metrics', 'summary', 'data', 'results']) {
    if (isObject(report[key])) return { object: report[key], wrapper: key };
  }
  return { object: report, wrapper: null };
}
function adaptSource(sourceName, report) {
  if (!isObject(report)) throw new Error(`${sourceName} source must be a JSON object`);
  const { object, wrapper } = unwrap(report);
  const sectionCandidates = SOURCE_MAP[sourceName];
  let located = null;
  for (const candidate of sectionCandidates) {
    if (isObject(object[candidate])) { located = { key: candidate, value: object[candidate] }; break; }
    if (isObject(report[candidate])) { located = { key: candidate, value: report[candidate] }; break; }
  }
  const section = located ? located.value : object;
  const warnings = [];
  const fields = {};
  const lineage = {};
  for (const [metricName, aliases] of Object.entries(ALIASES[sourceName])) {
    const got = getMetric(section, aliases, `${sourceName}.${metricName}`, sourceName === 'forestry' && metricName === 'survivalRate', warnings);
    fields[metricName] = got.value;
    lineage[metricName] = { sourceSection: located ? located.key : (wrapper || 'root'), sourceField: got.field };
  }
  let alerts = [];
  if (sourceName === 'recurringFailures') {
    const rawAlerts = section.alerts || section.recurringAlerts || [];
    if (!Array.isArray(rawAlerts)) throw new Error('recurringFailures alerts must be an array');
    alerts = rawAlerts.map((a, i) => {
      if (!isObject(a) || typeof a.code !== 'string' || typeof a.message !== 'string') throw new Error(`recurringFailures alert ${i} requires code and message strings`);
      return { code: a.code, severity: a.severity, message: a.message };
    });
  }
  return { fields, warnings, lineage, alerts, wrapper, section: located ? located.key : null };
}
function normalizeInput(manifest, options = {}) {
  if (!isObject(manifest)) throw new Error('Manifest must be a JSON object');
  if (!isObject(manifest.sources)) throw new Error('Manifest.sources must be an object');
  const generatedAt = parseDate(options.now || manifest.generatedAt) || new Date().toISOString().slice(0,10);
  const dashboardInput = {
    generatedAt,
    forestry: { treeCount: 0, plantedAcres: 0, survivalRate: 0 },
    apiary: { hives: 0, activeColonies: 0, honeyKg: 0 },
    workforce: { tasks: { total: 0, completed: 0, overdue: 0, blocked: 0, criticalUnverified: 0 } },
    inspections: { total: 0, issues: 0, highSeverity: 0, followUps: 0 },
    verification: { submitted: 0, approved: 0, returned: 0, rejected: 0, missingEvidence: 0, failedChecklistItems: 0, quantityShortfalls: 0 },
    correctiveActions: { open: 0, overdue: 0, ineffective: 0, criticalOpen: 0 },
    recurringFailures: { patterns: 0, alerts: [] },
    kpis: []
  };
  const warnings = [];
  const sources = [];
  const sourceReports = {};
  const mapping = {};
  const pathBase = options.baseDir || process.cwd();
  for (const sourceName of Object.keys(SOURCE_MAP)) {
    const spec = manifest.sources[sourceName];
    if (!spec) {
      warnings.push(`Missing source specification: ${sourceName}; metrics defaulted to 0`);
      sources.push({ name: sourceName, status: 'missing', path: null, sha256: null });
      continue;
    }
    if (typeof spec.path !== 'string' || !spec.path.trim()) throw new Error(`sources.${sourceName}.path must be a non-empty string`);
    const resolved = path.resolve(pathBase, spec.path);
    if (spec.required !== false && !fs.existsSync(resolved)) throw new Error(`Required source file not found: ${spec.path}`);
    if (!fs.existsSync(resolved)) {
      warnings.push(`Optional source file not found: ${spec.path}`);
      sources.push({ name: sourceName, status: 'missing_optional', path: spec.path, sha256: null });
      continue;
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    let report;
    try { report = JSON.parse(raw); } catch (e) { throw new Error(`${sourceName} source is not valid JSON: ${e.message}`); }
    const adapted = adaptSource(sourceName, report);
    sourceReports[sourceName] = adapted;
    warnings.push(...adapted.warnings.map(w => `${sourceName}: ${w}`));
    sources.push({ name: sourceName, status: 'loaded', path: spec.path, sha256: sha256(raw), bytes: Buffer.byteLength(raw), sourceReportType: report.reportType || report.type || null });
    mapping[sourceName] = adapted.lineage;
    if (sourceName === 'forestry') Object.assign(dashboardInput.forestry, adapted.fields);
    if (sourceName === 'apiary') Object.assign(dashboardInput.apiary, adapted.fields);
    if (sourceName === 'workforce') {
      const f = adapted.fields;
      Object.assign(dashboardInput.workforce.tasks, { total: f.total, completed: f.completed, overdue: f.overdue, blocked: f.blocked, criticalUnverified: f.criticalUnverified });
    }
    if (sourceName === 'inspections') Object.assign(dashboardInput.inspections, adapted.fields);
    if (sourceName === 'verification') Object.assign(dashboardInput.verification, adapted.fields);
    if (sourceName === 'correctiveActions') Object.assign(dashboardInput.correctiveActions, adapted.fields);
    if (sourceName === 'recurringFailures') {
      dashboardInput.recurringFailures.patterns = adapted.fields.patterns;
      dashboardInput.recurringFailures.alerts = adapted.alerts;
    }
  }
  if (dashboardInput.workforce.tasks.completed > dashboardInput.workforce.tasks.total) warnings.push('Mapped completed tasks exceed total tasks; Phase 145 validation will reject this input');
  return {
    schemaVersion: '1.0',
    reportType: 'forestos.data-integration-pipeline',
    generatedAt,
    mode: 'offline_file_integration',
    dashboardInput,
    integration: { sourceCount: sources.length, loadedCount: sources.filter(s=>s.status==='loaded').length, sources, mapping, warnings },
    sourceReports
  };
}
function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--') || !arg.includes('=')) throw new Error(`Invalid argument: ${arg}`);
    const [k, ...v] = arg.slice(2).split('=');
    out[k] = v.join('=');
  }
  return out;
}
function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.manifest) throw new Error('Usage: node scripts/phase146-automated-data-integration-pipeline.js --manifest=integration-manifest.json [--output=integrated-input.json] [--now=YYYY-MM-DD]');
    const manifestPath = path.resolve(args.manifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = normalizeInput(manifest, { baseDir: path.dirname(manifestPath), now: args.now });
    const output = JSON.stringify(result, null, 2) + '\n';
    if (args.output) fs.writeFileSync(path.resolve(args.output), output);
    else process.stdout.write(output);
  } catch (e) {
    process.stderr.write(`ForestOS Phase 146 error: ${e.message}\n`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { normalizeInput, adaptSource, parseDate, parseArgs };
