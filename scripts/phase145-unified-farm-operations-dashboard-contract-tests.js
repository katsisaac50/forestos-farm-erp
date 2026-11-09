#!/usr/bin/env node
'use strict';
const assert = require('assert');
const { buildDashboard, validateDate, parseArgs } = require('./phase145-unified-farm-operations-dashboard');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.error(`FAIL ${name}: ${e.stack}`); process.exitCode = 1; } }
const sample = {
  generatedAt: '2026-10-28',
  forestry: { treeCount: 7000, plantedAcres: 7, survivalRate: 0.93 },
  apiary: { hives: 10, activeColonies: 1, honeyKg: 0 },
  workforce: { tasks: { total: 10, completed: 5, overdue: 2, blocked: 1, criticalUnverified: 1 } },
  inspections: { total: 5, issues: 3, highSeverity: 1, followUps: 2 },
  verification: { submitted: 3, approved: 2, returned: 1, rejected: 0, missingEvidence: 2, failedChecklistItems: 1, quantityShortfalls: 1 },
  correctiveActions: { open: 4, overdue: 1, ineffective: 0, criticalOpen: 1 },
  recurringFailures: { patterns: 2, alerts: [{ code: 'manual', severity: 'low', message: 'Example alert' }] },
  kpis: [{ name: 'Tree survival', value: 0.93, target: 0.95, unit: 'ratio' }]
};
test('builds expected report type', () => assert.strictEqual(buildDashboard(sample).reportType, 'forestos.unified-farm-operations-dashboard'));
test('uses deterministic now override', () => assert.strictEqual(buildDashboard(sample, {now:'2026-10-29'}).generatedAt, '2026-10-29'));
test('reports offline snapshot mode', () => assert.strictEqual(buildDashboard(sample).mode, 'offline_snapshot'));
test('carries forestry metrics', () => assert.strictEqual(buildDashboard(sample).operations.forestry.treeCount, 7000));
test('carries apiary metrics', () => assert.strictEqual(buildDashboard(sample).operations.apiary.hives, 10));
test('calculates task completion rate', () => assert.strictEqual(buildDashboard(sample).executiveSummary.workforceCompletionRate, 0.5));
test('calculates inspection issue rate', () => assert.strictEqual(buildDashboard(sample).executiveSummary.inspectionIssueRate, 0.6));
test('calculates verification approval rate', () => assert.strictEqual(buildDashboard(sample).executiveSummary.verificationApprovalRate, 2/3));
test('critical conditions make readiness red', () => assert.strictEqual(buildDashboard(sample).executiveSummary.readiness, 'red'));
test('counts critical alerts', () => assert.ok(buildDashboard(sample).executiveSummary.criticalAlerts >= 2));
test('adds overdue-work alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='overdue_work')));
test('adds blocked-work alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='blocked_work')));
test('adds critical-unverified alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='critical_unverified')));
test('adds inspection severity alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='high_severity_inspections')));
test('adds evidence alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='missing_evidence')));
test('adds overdue corrective action alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='overdue_corrective_actions')));
test('adds recurring failure alert', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='recurring_failure_patterns')));
test('preserves custom alerts', () => assert.ok(buildDashboard(sample).alerts.some(a=>a.code==='manual')));
test('unknown custom severity defaults medium', () => { const x=structuredClone(sample); x.recurringFailures.alerts=[{code:'x',message:'x',severity:'wat'}]; assert.strictEqual(buildDashboard(x).alerts.find(a=>a.code==='x').severity,'medium'); });
test('includes KPI target gap', () => assert.ok(Math.abs(buildDashboard(sample).kpis[0].gap - 0.02) < 1e-9));
test('flags KPI below target', () => assert.strictEqual(buildDashboard(sample).kpis[0].meetsTarget, false));
test('KPI above target passes', () => { const x=structuredClone(sample); x.kpis[0].value=1; assert.strictEqual(buildDashboard(x).kpis[0].meetsTarget,true); });
test('creates prioritized verification task', () => assert.ok(buildDashboard(sample).priorities.some(p=>p.action.includes('Verify critical work'))));
test('creates inspection priority', () => assert.ok(buildDashboard(sample).priorities.some(p=>p.action.includes('high-severity'))));
test('creates overdue priority', () => assert.ok(buildDashboard(sample).priorities.some(p=>p.action.includes('overdue work'))));
test('creates evidence priority', () => assert.ok(buildDashboard(sample).priorities.some(p=>p.action.includes('evidence'))));
test('creates recurrence priority', () => assert.ok(buildDashboard(sample).priorities.some(p=>p.action.includes('repeat failures'))));
test('empty object is supported with warnings', () => { const x=buildDashboard({generatedAt:'2026-10-28'}); assert.ok(x.dataQuality.warnings.length>0); });
test('empty input rejected', () => assert.throws(()=>buildDashboard(null), /JSON object/));
test('array input rejected', () => assert.throws(()=>buildDashboard([]), /JSON object/));
test('negative metric rejected', () => { const x=structuredClone(sample); x.apiary.hives=-1; assert.throws(()=>buildDashboard(x), /non-negative/); });
test('nonfinite metric rejected', () => { const x=structuredClone(sample); x.apiary.honeyKg=Infinity; assert.throws(()=>buildDashboard(x), /non-negative/); });
test('ratio over one rejected', () => { const x=structuredClone(sample); x.forestry.survivalRate=1.1; assert.throws(()=>buildDashboard(x), /between 0 and 1/); });
test('completed tasks cannot exceed total', () => { const x=structuredClone(sample); x.workforce.tasks.completed=11; assert.throws(()=>buildDashboard(x), /cannot exceed/); });
test('approved cannot exceed submitted when submitted positive', () => { const x=structuredClone(sample); x.verification.approved=4; assert.throws(()=>buildDashboard(x), /cannot exceed/); });
test('zero submitted permits approved historical count', () => { const x=structuredClone(sample); x.verification.submitted=0; x.verification.approved=2; assert.strictEqual(buildDashboard(x).executiveSummary.verificationApprovalRate,null); });
test('invalid date format rejected', () => assert.throws(()=>validateDate('28-10-2026'), /YYYY-MM-DD/));
test('impossible date rejected', () => assert.throws(()=>validateDate('2026-02-30'), /real calendar date/));
test('valid date retained', () => assert.strictEqual(validateDate('2026-10-28'),'2026-10-28'));
test('kpis must be array', () => { const x=structuredClone(sample); x.kpis={}; assert.throws(()=>buildDashboard(x), /kpis must be an array/); });
test('KPI name required', () => { const x=structuredClone(sample); x.kpis=[{value:1,target:1}]; assert.throws(()=>buildDashboard(x), /non-empty name/); });
test('recurring alerts must be array', () => { const x=structuredClone(sample); x.recurringFailures.alerts={}; assert.throws(()=>buildDashboard(x), /must be an array/); });
test('custom alert needs code and message', () => { const x=structuredClone(sample); x.recurringFailures.alerts=[{code:1,message:'x'}]; assert.throws(()=>buildDashboard(x), /requires string code and message/); });
test('no alert snapshot gives green readiness', () => { const x={generatedAt:'2026-10-28'}; assert.strictEqual(buildDashboard(x).executiveSummary.readiness,'green'); });
test('high alert snapshot gives amber readiness', () => { const x={generatedAt:'2026-10-28', workforce:{tasks:{overdue:1}}}; assert.strictEqual(buildDashboard(x).executiveSummary.readiness,'amber'); });
test('criticalOpen retained', () => assert.strictEqual(buildDashboard(sample).operations.correctiveActions.criticalOpen,1));
test('data-quality counts KPI records', () => assert.strictEqual(buildDashboard(sample).dataQuality.suppliedKpiCount,1));
test('custom alert count recorded', () => assert.strictEqual(buildDashboard(sample).dataQuality.recurringAlertCount,1));
test('parses CLI args with equals in value', () => assert.strictEqual(parseArgs(['--input=a=b.json']).input,'a=b.json'));
test('invalid CLI arg rejected', () => assert.throws(()=>parseArgs(['input=a']), /Invalid argument/));
test('priorities have numeric rank', () => assert.ok(buildDashboard(sample).priorities.every(p=>Number.isInteger(p.priority))));
test('completion rate null when no tasks', () => assert.strictEqual(buildDashboard({}).executiveSummary.workforceCompletionRate,null));
test('issue rate null when no inspections', () => assert.strictEqual(buildDashboard({}).executiveSummary.inspectionIssueRate,null));
test('approval rate null when no submissions', () => assert.strictEqual(buildDashboard({}).executiveSummary.verificationApprovalRate,null));
test('does not mutate input', () => { const x=structuredClone(sample); const before=JSON.stringify(x); buildDashboard(x); assert.strictEqual(JSON.stringify(x),before); });
console.log(`Phase 145 contract tests: ${passed} passed`);
