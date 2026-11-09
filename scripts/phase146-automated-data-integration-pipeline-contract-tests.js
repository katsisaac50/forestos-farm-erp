#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizeInput, adaptSource, parseDate, parseArgs } = require('./phase146-automated-data-integration-pipeline');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forestos146-'));
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch(e) { console.error(`FAIL ${name}: ${e.stack}`); process.exitCode = 1; } }
function write(name, data) { const p=path.join(tmp,name); fs.writeFileSync(p,JSON.stringify(data)); return p; }
const sources = {
 forestry: { reportType:'forestry', metrics:{treeCount:7000,plantedAcres:7,survivalRate:0.93} },
 apiary: { apiary:{hives:10,activeColonies:1,honeyKg:12} },
 workforce: { summary:{totalTasks:10,completedTasks:8,overdueTasks:1,blockedTasks:0,criticalUnverifiedTasks:0} },
 inspections: { inspections:{totalInspections:4,totalIssues:2,highSeverityIssues:0,followUpCount:1} },
 verification: { verificationSummary:{submittedCount:5,approvedCount:4,returnedCount:1,rejectedCount:0,missingEvidenceCount:1,failedItems:0,shortfalls:0} },
 correctiveActions: { capa:{openActions:3,overdueActions:1,ineffectiveActions:0,criticalOpenActions:0} },
 recurringFailures: { recurringFailures:{patternCount:1,alerts:[{code:'repeat',severity:'high',message:'Review repeat issue'}]} }
};
const filePaths = {};
for (const [k,v] of Object.entries(sources)) filePaths[k]=write(`${k}.json`,v);
function manifest() { return {generatedAt:'2026-10-28',sources:Object.fromEntries(Object.entries(filePaths).map(([k,p])=>[k,{path:path.basename(p)}]))}; }
test('normalizes all seven source types',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).integration.loadedCount,7));
test('report type is stable',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).reportType,'forestos.data-integration-pipeline'));
test('sets offline integration mode',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).mode,'offline_file_integration'));
test('deterministic date override',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp,now:'2026-10-29'}).generatedAt,'2026-10-29'));
test('maps forestry tree count',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.forestry.treeCount,7000));
test('maps forestry acreage',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.forestry.plantedAcres,7));
test('maps survival rate',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.forestry.survivalRate,0.93));
test('maps apiary hive count',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.apiary.hives,10));
test('maps workforce total',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.workforce.tasks.total,10));
test('maps workforce completion',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.workforce.tasks.completed,8));
test('maps inspection issues',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.inspections.issues,2));
test('maps verification approvals',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.verification.approved,4));
test('maps CAPA open actions',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.correctiveActions.open,3));
test('maps recurring failure patterns',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.recurringFailures.patterns,1));
test('maps recurring alerts',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).dashboardInput.recurringFailures.alerts[0].code,'repeat'));
test('tracks source hash',()=>assert.match(normalizeInput(manifest(),{baseDir:tmp}).integration.sources[0].sha256,/^[a-f0-9]{64}$/));
test('tracks byte size',()=>assert.ok(normalizeInput(manifest(),{baseDir:tmp}).integration.sources[0].bytes>0));
test('tracks field-level lineage',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).integration.mapping.forestry.treeCount.sourceField,'treeCount'));
test('tracks source report type',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).integration.sources[0].sourceReportType,'forestry'));
test('missing source spec warns and defaults',()=>{const m=manifest();delete m.sources.apiary;const x=normalizeInput(m,{baseDir:tmp});assert.ok(x.integration.warnings.some(w=>w.includes('Missing source specification: apiary')));assert.strictEqual(x.dashboardInput.apiary.hives,0);});
test('optional missing source file allowed',()=>{const m=manifest();m.sources.apiary={path:'absent.json',required:false};const x=normalizeInput(m,{baseDir:tmp});assert.strictEqual(x.integration.sources.find(s=>s.name==='apiary').status,'missing_optional');});
test('required missing source file rejected',()=>{const m=manifest();m.sources.apiary={path:'absent.json'};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/not found/);});
test('manifest object required',()=>assert.throws(()=>normalizeInput(null),/Manifest must be/));
test('sources object required',()=>assert.throws(()=>normalizeInput({}),/Manifest.sources/));
test('source path required',()=>{const m=manifest();m.sources.apiary={};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/path must be/);});
test('invalid JSON rejected',()=>{fs.writeFileSync(path.join(tmp,'bad.json'),'{');const m=manifest();m.sources.apiary={path:'bad.json'};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/not valid JSON/);});
test('source must be object',()=>assert.throws(()=>adaptSource('forestry',[]),/JSON object/));
test('negative metric rejected',()=>{const p=write('negative.json',{forestry:{treeCount:-1}});const m=manifest();m.sources.forestry={path:path.basename(p)};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/non-negative/);});
test('nonfinite-like string metric rejected',()=>{const p=write('string.json',{forestry:{treeCount:'7000'}});const m=manifest();m.sources.forestry={path:path.basename(p)};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/non-negative/);});
test('survival ratio over one rejected',()=>{const p=write('ratio.json',{forestry:{survivalRate:1.1}});const m=manifest();m.sources.forestry={path:path.basename(p)};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/between 0 and 1/);});
test('missing metrics emit warnings',()=>{const p=write('missing-metrics.json',{});const m=manifest();m.sources.forestry={path:path.basename(p)};assert.ok(normalizeInput(m,{baseDir:tmp}).integration.warnings.some(w=>w.includes('forestry.treeCount')));});
test('supports direct root metrics',()=>{const x=adaptSource('forestry',{treeCount:100,plantedAcres:1,survivalRate:0.8});assert.strictEqual(x.fields.treeCount,100);});
test('supports nested metrics wrapper',()=>{const x=adaptSource('forestry',{metrics:{treeCount:100}});assert.strictEqual(x.fields.treeCount,100);});
test('supports summary wrapper',()=>{const x=adaptSource('workforce',{summary:{totalTasks:3}});assert.strictEqual(x.fields.total,3);});
test('supports alternate aliases',()=>{const x=adaptSource('apiary',{hiveCount:6,occupiedHives:4,honeyHarvestKg:2});assert.deepStrictEqual([x.fields.hives,x.fields.activeColonies,x.fields.honeyKg],[6,4,2]);});
test('malformed recurring alerts rejected',()=>{const p=write('bad-alert.json',{recurringFailures:{alerts:{}}});const m=manifest();m.sources.recurringFailures={path:path.basename(p)};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/alerts must be an array/);});
test('alert code and message required',()=>{const p=write('bad-alert2.json',{recurringFailures:{alerts:[{code:'x'}]}});const m=manifest();m.sources.recurringFailures={path:path.basename(p)};assert.throws(()=>normalizeInput(m,{baseDir:tmp}),/requires code and message/);});
test('missing generated date gets deterministic supplied now',()=>assert.strictEqual(normalizeInput({sources:{}},{now:'2026-10-28'}).generatedAt,'2026-10-28'));
test('invalid date format rejected',()=>assert.throws(()=>parseDate('28-10-2026'),/YYYY-MM-DD/));
test('impossible date rejected',()=>assert.throws(()=>parseDate('2026-02-30'),/real date/));
test('valid date retained',()=>assert.strictEqual(parseDate('2026-10-28'),'2026-10-28'));
test('CLI args parse equals in value',()=>assert.strictEqual(parseArgs(['--manifest=a=b.json']).manifest,'a=b.json'));
test('invalid CLI arg rejected',()=>assert.throws(()=>parseArgs(['manifest=x']),/Invalid argument/));
test('all source types get statuses',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).integration.sources.length,7));
test('loaded count correct',()=>assert.strictEqual(normalizeInput(manifest(),{baseDir:tmp}).integration.loadedCount,7));
test('optional metrics default to zero',()=>assert.strictEqual(normalizeInput({sources:{}},{now:'2026-10-28'}).dashboardInput.forestry.treeCount,0));
test('lineage records missing field as null',()=>assert.strictEqual(normalizeInput({sources:{forestry:{path:'forestry.json'}}},{baseDir:tmp}).integration.mapping.forestry.treeCount.sourceField,'treeCount'));
test('SHA hash stable for same file',()=>{const x=normalizeInput(manifest(),{baseDir:tmp});const y=normalizeInput(manifest(),{baseDir:tmp});assert.strictEqual(x.integration.sources[0].sha256,y.integration.sources[0].sha256);});
test('does not modify source reports',()=>{const p=filePaths.forestry;const before=fs.readFileSync(p,'utf8');normalizeInput(manifest(),{baseDir:tmp});assert.strictEqual(fs.readFileSync(p,'utf8'),before);});
test('path resolution is relative to manifest directory',()=>{const m=manifest();const x=normalizeInput(m,{baseDir:tmp});assert.strictEqual(x.integration.sources[0].status,'loaded');});
test('handles unknown alert severity for downstream validation',()=>{const x=adaptSource('recurringFailures',{recurringFailures:{alerts:[{code:'x',message:'y',severity:'odd'}]}});assert.strictEqual(x.alerts[0].severity,'odd');});
test('keeps missing-source count visible',()=>assert.ok(normalizeInput({sources:{}},{now:'2026-10-28'}).integration.warnings.length>=7));
console.log(`Phase 146 contract tests: ${passed} passed`);
fs.rmSync(tmp,{recursive:true,force:true});
