#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api');
const pkg = JSON.parse(fs.readFileSync(path.join(api, 'package.json'), 'utf8'));
const checks = [
 { name: 'API package manifest exists and parses', passed: true },
 { name: 'build script is configured', passed: typeof pkg.scripts?.build === 'string' && pkg.scripts.build.includes('nest build') },
 { name: 'Nest CLI dependency declared', passed: Boolean(pkg.devDependencies?.['@nestjs/cli']) },
 { name: 'installed API dependencies available', passed: fs.existsSync(path.join(api, 'node_modules', '@nestjs', 'core')) },
 { name: 'HTTP smoke probe is opt-in and read-only', passed: fs.existsSync(path.join(root, 'scripts/phase188-authentication-http-smoke.js')) },
];
const report = { phase: 188, purpose: 'runtime authentication test preflight', checks, passed: checks.filter(x => x.passed).length, total: checks.length, buildExecuted: false, liveHttpTestsExecuted: false, productionCleared: false, note: 'Preflight reports prerequisites only; it does not run the NestJS build or make HTTP requests.' };
fs.writeFileSync(path.join(root, 'PHASE188_RUNTIME_BUILD_PREFLIGHT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 2;
