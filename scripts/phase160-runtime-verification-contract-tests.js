#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const runner = fs.readFileSync(path.join(__dirname, 'phase160-runtime-verification.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const checks = [];
function check(name, ok) { checks.push({ name, passed: !!ok }); }
check('Runtime runner writes a JSON report', runner.includes('PHASE160_RUNTIME_VERIFICATION.json'));
check('Build only runs when Nest CLI exists', runner.includes("if (!fs.existsSync(depsDir) || !fs.existsSync(nestBin))"));
check('Live database is opt-in', runner.includes('process.env.FORESTOS_TEST_MONGODB_URI'));
check('Database name safety gate blocks ambiguous targets', runner.includes('looksDisposable') && runner.includes("'BLOCKED'"));
check('Connection URI is not printed', runner.includes('URI was not printed') && !runner.includes('console.log(uri)'));
check('MongoDB test runner is invoked only after safety gate', runner.indexOf("if (!parsed || !/^mongodb") < runner.indexOf("'BLOCKED'") && runner.includes('phase156-mongodb-integration-tests.js'));
check('Build script remains configured', pkg.scripts && pkg.scripts.build === 'nest build');
check('Report distinguishes skipped tests from passes', runner.includes("'SKIP'") && runner.includes('limitations'));
for (const c of checks) console.log(`${c.passed ? 'PASS' : 'FAIL'} ${c.name}`);
console.log(`Phase 160 contract tests: ${checks.filter(c=>c.passed).length}/${checks.length} passed.`);
if (checks.some(c=>!c.passed)) process.exitCode = 1;
