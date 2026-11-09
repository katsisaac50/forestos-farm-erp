#!/usr/bin/env node
'use strict';

/**
 * ForestOS Phase 145 — Unified Farm Operations Dashboard
 * Deterministic offline report builder. Input is a manually consolidated JSON snapshot.
 */
const fs = require('fs');
const path = require('path');

const METRIC_PATHS = [
  ['forestry.treeCount', 'forestry', 'treeCount', 'count'],
  ['forestry.plantedAcres', 'forestry', 'plantedAcres', 'acres'],
  ['forestry.survivalRate', 'forestry', 'survivalRate', 'ratio'],
  ['apiary.hives', 'apiary', 'hives', 'count'],
  ['apiary.activeColonies', 'apiary', 'activeColonies', 'count'],
  ['apiary.honeyKg', 'apiary', 'honeyKg', 'kg'],
  ['workforce.tasks.total', 'workforce', 'tasks.total', 'count'],
  ['workforce.tasks.completed', 'workforce', 'tasks.completed', 'count'],
  ['workforce.tasks.overdue', 'workforce', 'tasks.overdue', 'count'],
  ['workforce.tasks.blocked', 'workforce', 'tasks.blocked', 'count'],
  ['workforce.tasks.criticalUnverified', 'workforce', 'tasks.criticalUnverified', 'count'],
  ['inspections.total', 'inspections', 'total', 'count'],
  ['inspections.issues', 'inspections', 'issues', 'count'],
  ['inspections.highSeverity', 'inspections', 'highSeverity', 'count'],
  ['inspections.followUps', 'inspections', 'followUps', 'count'],
  ['verification.submitted', 'verification', 'submitted', 'count'],
  ['verification.approved', 'verification', 'approved', 'count'],
  ['verification.returned', 'verification', 'returned', 'count'],
  ['verification.rejected', 'verification', 'rejected', 'count'],
  ['verification.missingEvidence', 'verification', 'missingEvidence', 'count'],
  ['verification.failedChecklistItems', 'verification', 'failedChecklistItems', 'count'],
  ['verification.quantityShortfalls', 'verification', 'quantityShortfalls', 'count'],
  ['correctiveActions.open', 'correctiveActions', 'open', 'count'],
  ['correctiveActions.overdue', 'correctiveActions', 'overdue', 'count'],
  ['correctiveActions.ineffective', 'correctiveActions', 'ineffective', 'count'],
  ['correctiveActions.criticalOpen', 'correctiveActions', 'criticalOpen', 'count'],
  ['recurringFailures.patterns', 'recurringFailures', 'patterns', 'count']
];

function readPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined, obj);
}
function asNumber(value, label, warnings) {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite, non-negative number`);
  }
  return value;
}
function validateDate(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('generatedAt must use YYYY-MM-DD');
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error('generatedAt must be a real calendar date');
  return value;
}
function metric(input, key, group, property, unit, warnings) {
  const obj = readPath(input, `${group}.${property}`);
  if (obj === undefined) warnings.push(`Missing ${key}; defaulted to 0`);
  const value = asNumber(obj, key, warnings);
  if (unit === 'ratio' && value > 1) throw new Error(`${key} must be between 0 and 1`);
  return value;
}
function buildDashboard(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be a JSON object');
  const warnings = [];
  const generatedAt = validateDate(options.now || input.generatedAt) || new Date().toISOString().slice(0, 10);
  const values = {};
  for (const [key, group, property, unit] of METRIC_PATHS) {
    values[key] = metric(input, key, group, property, unit, warnings);
  }
  const kpis = input.kpis === undefined ? [] : input.kpis;
  if (!Array.isArray(kpis)) throw new Error('kpis must be an array');
  const kpiResults = kpis.map((kpi, index) => {
    if (!kpi || typeof kpi !== 'object' || Array.isArray(kpi) || typeof kpi.name !== 'string' || !kpi.name.trim()) {
      throw new Error(`kpis[${index}] must have a non-empty name`);
    }
    const value = asNumber(kpi.value, `kpis[${index}].value`, warnings);
    const target = asNumber(kpi.target, `kpis[${index}].target`, warnings);
    const unit = typeof kpi.unit === 'string' ? kpi.unit : '';
    return { name: kpi.name.trim(), value, target, unit, meetsTarget: value >= target, gap: Math.max(0, target - value) };
  });
  const recurringAlerts = input.recurringFailures && input.recurringFailures.alerts !== undefined
    ? input.recurringFailures.alerts : [];
  if (!Array.isArray(recurringAlerts)) throw new Error('recurringFailures.alerts must be an array');
  const alerts = [];
  const addAlert = (code, severity, message) => alerts.push({ code, severity, message });
  if (values['workforce.tasks.overdue'] > 0) addAlert('overdue_work', 'high', `${values['workforce.tasks.overdue']} workforce task(s) overdue`);
  if (values['workforce.tasks.blocked'] > 0) addAlert('blocked_work', 'high', `${values['workforce.tasks.blocked']} workforce task(s) blocked`);
  if (values['workforce.tasks.criticalUnverified'] > 0) addAlert('critical_unverified', 'critical', `${values['workforce.tasks.criticalUnverified']} critical task(s) lack verification`);
  if (values['inspections.highSeverity'] > 0) addAlert('high_severity_inspections', 'critical', `${values['inspections.highSeverity']} high-severity inspection issue(s)`);
  if (values['verification.missingEvidence'] > 0) addAlert('missing_evidence', 'high', `${values['verification.missingEvidence']} verification record(s) missing evidence`);
  if (values['correctiveActions.overdue'] > 0) addAlert('overdue_corrective_actions', 'high', `${values['correctiveActions.overdue']} corrective action(s) overdue`);
  if (values['correctiveActions.ineffective'] > 0) addAlert('ineffective_corrective_actions', 'critical', `${values['correctiveActions.ineffective']} corrective action(s) marked ineffective`);
  if (values['recurringFailures.patterns'] > 0) addAlert('recurring_failure_patterns', 'high', `${values['recurringFailures.patterns']} recurring failure pattern(s) detected`);
  recurringAlerts.forEach((a, i) => {
    if (!a || typeof a !== 'object' || typeof a.code !== 'string' || typeof a.message !== 'string') {
      throw new Error(`recurringFailures.alerts[${i}] requires string code and message`);
    }
    const severity = ['low', 'medium', 'high', 'critical'].includes(a.severity) ? a.severity : 'medium';
    alerts.push({ code: a.code, severity, message: a.message });
  });
  const totalTasks = values['workforce.tasks.total'];
  const completedTasks = values['workforce.tasks.completed'];
  if (completedTasks > totalTasks) throw new Error('workforce.tasks.completed cannot exceed workforce.tasks.total');
  const submitted = values['verification.submitted'];
  const approved = values['verification.approved'];
  if (approved > submitted && submitted > 0) throw new Error('verification.approved cannot exceed verification.submitted');
  const issueRate = values['inspections.total'] > 0 ? values['inspections.issues'] / values['inspections.total'] : null;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : null;
  const approvalRate = submitted > 0 ? approved / submitted : null;
  const priorities = [];
  if (values['workforce.tasks.criticalUnverified'] > 0) priorities.push({ priority: 1, action: 'Verify critical work before sign-off', reason: `${values['workforce.tasks.criticalUnverified']} critical task(s) lack verification` });
  if (values['inspections.highSeverity'] > 0) priorities.push({ priority: 2, action: 'Contain and assign high-severity inspection issues', reason: `${values['inspections.highSeverity']} high-severity issue(s)` });
  if (values['correctiveActions.overdue'] > 0 || values['workforce.tasks.overdue'] > 0) priorities.push({ priority: 3, action: 'Review overdue work and corrective actions', reason: `${values['workforce.tasks.overdue']} overdue task(s), ${values['correctiveActions.overdue']} overdue corrective action(s)` });
  if (values['verification.missingEvidence'] > 0 || values['verification.failedChecklistItems'] > 0 || values['verification.quantityShortfalls'] > 0) priorities.push({ priority: 4, action: 'Close verification evidence and checklist gaps', reason: `${values['verification.missingEvidence']} missing-evidence, ${values['verification.failedChecklistItems']} failed checklist, ${values['verification.quantityShortfalls']} quantity shortfall item(s)` });
  if (values['correctiveActions.ineffective'] > 0 || values['recurringFailures.patterns'] > 0) priorities.push({ priority: 5, action: 'Reassess root-cause controls and repeat failures', reason: `${values['correctiveActions.ineffective']} ineffective action(s), ${values['recurringFailures.patterns']} recurring pattern(s)` });
  if (priorities.length === 0) priorities.push({ priority: 1, action: 'Maintain routine inspections and evidence-based sign-off', reason: 'No high-priority condition was triggered by the supplied snapshot' });
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const readiness = criticalCount > 0 ? 'red' : highCount > 0 ? 'amber' : 'green';
  return {
    schemaVersion: '1.0',
    reportType: 'forestos.unified-farm-operations-dashboard',
    generatedAt,
    mode: 'offline_snapshot',
    executiveSummary: {
      readiness,
      readinessBasis: 'Rule-based indicator from supplied alert counts; not a certification of farm safety or business performance.',
      criticalAlerts: criticalCount,
      highAlerts: highCount,
      totalAlerts: alerts.length,
      workforceCompletionRate: completionRate,
      inspectionIssueRate: issueRate,
      verificationApprovalRate: approvalRate
    },
    operations: {
      forestry: { treeCount: values['forestry.treeCount'], plantedAcres: values['forestry.plantedAcres'], survivalRate: values['forestry.survivalRate'] },
      apiary: { hives: values['apiary.hives'], activeColonies: values['apiary.activeColonies'], honeyKg: values['apiary.honeyKg'] },
      workforce: { totalTasks, completedTasks, overdueTasks: values['workforce.tasks.overdue'], blockedTasks: values['workforce.tasks.blocked'], criticalUnverified: values['workforce.tasks.criticalUnverified'], completionRate },
      inspections: { total: values['inspections.total'], issues: values['inspections.issues'], highSeverity: values['inspections.highSeverity'], followUps: values['inspections.followUps'], issueRate },
      verification: { submitted, approved, returned: values['verification.returned'], rejected: values['verification.rejected'], missingEvidence: values['verification.missingEvidence'], failedChecklistItems: values['verification.failedChecklistItems'], quantityShortfalls: values['verification.quantityShortfalls'], approvalRate },
      correctiveActions: { open: values['correctiveActions.open'], overdue: values['correctiveActions.overdue'], ineffective: values['correctiveActions.ineffective'], criticalOpen: values['correctiveActions.criticalOpen'] },
      recurringFailures: { patterns: values['recurringFailures.patterns'] }
    },
    kpis: kpiResults,
    alerts,
    priorities,
    dataQuality: { warnings, suppliedKpiCount: kpiResults.length, recurringAlertCount: recurringAlerts.length }
  };
}
function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith('--') || !arg.includes('=')) throw new Error(`Invalid argument: ${arg}`);
    const [key, ...rest] = arg.slice(2).split('=');
    out[key] = rest.join('=');
  }
  return out;
}
function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.input) throw new Error('Usage: node scripts/phase145-unified-farm-operations-dashboard.js --input=dashboard-input.json [--output=dashboard-report.json] [--now=YYYY-MM-DD]');
    const inputPath = path.resolve(args.input);
    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const report = buildDashboard(input, { now: args.now });
    const json = JSON.stringify(report, null, 2) + '\n';
    if (args.output) fs.writeFileSync(path.resolve(args.output), json);
    else process.stdout.write(json);
  } catch (error) {
    process.stderr.write(`ForestOS Phase 145 error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { buildDashboard, validateDate, parseArgs };
