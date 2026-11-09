#!/usr/bin/env node
'use strict';
const fs = require('node:fs'); const path = require('node:path'); const root = path.resolve(__dirname, '..');
const scan = fs.readFileSync(path.join(root, 'scripts/phase181-audit-call-chain-trace.js'), 'utf8');
const report = JSON.parse(fs.readFileSync(path.join(root, 'PHASE181_AUDIT_CALL_CHAIN_TRACE.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const checks = [
 ['trace reports legacy audit call sites', report.summary.legacyCallSites > 0],
 ['each call site includes a source line', report.findings.every(x => Number.isInteger(x.line) && x.line > 0)],
 ['controller existence is reported', report.findings.every(x => typeof x.controllerFound === 'boolean')],
 ['role decorator treated as signal only', /signals, not proof/.test(scan)],
 ['explicit guard signal is inventoried', report.findings.every(x => typeof x.explicitGuardSignal === 'boolean')],
 ['tenant context is not inferred from email', /actor email/.test(scan)],
 ['read and write tenant scope are both required', /both reads and writes/.test(report.safetyRules.join(' '))],
 ['no automatic conversion claimed', report.summary.convertedCallSites === 0],
 ['production clearance remains blocked', report.productionClearance === 'NOT CLEARED FOR PRODUCTION'],
 ['phase command registered', !!pkg.scripts['test:phase181:contract'] && !!pkg.scripts['audit:phase181:trace']],
 ['README documents phase 181', /Phase 181 — Audit Writer Call-Chain Trace/.test(readme)],
 ['scanner does not connect to database', !/mongoose\.connect|MongoClient/.test(scan)],
];
let failed = 0; for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 181 contract tests: ${checks.length - failed}/${checks.length} passed`); if (failed) process.exitCode = 1;
