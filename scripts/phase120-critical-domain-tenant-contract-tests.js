'use strict';
const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '..'); let passed = 0;
function ok(name, condition) { if (!condition) { console.error(`FAIL ${name}`); process.exitCode = 1; } else { passed++; console.log(`PASS ${name}`); } }
const script = fs.readFileSync(path.join(__dirname, 'phase120-critical-domain-tenant-coverage.js'), 'utf8');
const reportPath = path.join(root, 'PHASE120_CRITICAL_DOMAIN_TENANT_COVERAGE.json');
if (!fs.existsSync(reportPath)) require('./phase120-critical-domain-tenant-coverage.js');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
ok('coverage script identifies selected critical domains', ['sales','inventory','procurement','finance','workforce','evidence','audit'].every(x => script.includes(`'${x}'`)));
ok('report is explicitly static triage, not certification', report.status === 'TRIAGE_ONLY_NOT_A_SECURITY_FINDING_OR_PRODUCTION_CERTIFICATION' && /not proof of enforcement/i.test(report.method));
ok('sales domain surfaced for review', report.domains.some(x => x.domain === 'sales' && x.status === 'STATIC_SOURCE_REVIEW'));
ok('inventory domain surfaced for review', report.domains.some(x => x.domain === 'inventory' && x.status === 'STATIC_SOURCE_REVIEW'));
ok('procurement domain surfaced for review', report.domains.some(x => x.domain === 'procurement' && x.status === 'STATIC_SOURCE_REVIEW'));
ok('finance domain surfaced for review', report.domains.some(x => x.domain === 'finance' && x.status === 'STATIC_SOURCE_REVIEW'));
ok('unscoped query heuristic included', script.includes('UNSCOPED_LOOKING_QUERY_PATTERN'));
ok('review evidence calls for cross-tenant tests', report.domains.filter(x=>x.status==='STATIC_SOURCE_REVIEW').every(x=>x.requiredEvidence.some(y=>/cross-tenant deny/i.test(y))));
ok('report has reproducible summary counts', report.summary.domainsReviewed + report.summary.domainsNotFound === report.domains.length && report.summary.p1Review + report.summary.p2Review + report.summary.p3Verify <= report.domains.length);
ok('API package exposes phase 120 commands', /audit:phase120:tenant-coverage/.test(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8')));
ok('read-only Phase 119 probe remains GET-only', /only GET/i.test(fs.readFileSync(path.join(root,'PHASE119_NOTES.md'),'utf8')) || /GET requests only/i.test(fs.readFileSync(path.join(root,'PHASE119_NOTES.md'),'utf8')));
console.log(`Phase 120 contract tests: ${passed}/11 passed`);
