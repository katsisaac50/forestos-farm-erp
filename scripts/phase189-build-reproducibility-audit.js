#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api');
const pkgPath = path.join(api, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lockCandidates = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock'];
const lockfiles = lockCandidates.filter(name => fs.existsSync(path.join(api, name)));
const checks = [
  { name: 'API package manifest parses', passed: true, detail: 'apps/api/package.json parsed successfully' },
  { name: 'NestJS build script exists', passed: typeof pkg.scripts?.build === 'string' && pkg.scripts.build.includes('nest build'), detail: pkg.scripts?.build || 'missing' },
  { name: 'Nest CLI declared as development dependency', passed: Boolean(pkg.devDependencies?.['@nestjs/cli']), detail: pkg.devDependencies?.['@nestjs/cli'] || 'missing' },
  { name: 'TypeScript compiler configuration exists', passed: fs.existsSync(path.join(api, 'tsconfig.json')), detail: 'apps/api/tsconfig.json' },
  { name: 'Dependency lockfile exists', passed: lockfiles.length > 0, detail: lockfiles.length ? lockfiles.join(', ') : 'BLOCKER: no API lockfile found' },
  { name: 'Installed NestJS dependencies available', passed: fs.existsSync(path.join(api, 'node_modules/@nestjs/core')), detail: fs.existsSync(path.join(api, 'node_modules/@nestjs/core')) ? 'installed' : 'BLOCKER: apps/api/node_modules/@nestjs/core not found' },
  { name: 'Phase 188 HTTP smoke probe available', passed: fs.existsSync(path.join(root, 'scripts/phase188-authentication-http-smoke.js')), detail: 'read-only probe script present' },
];
const report = {
  phase: 189,
  purpose: 'reproducible API build readiness audit',
  generatedAt: new Date().toISOString(),
  apiPackage: pkg.name,
  checks,
  passed: checks.filter(c => c.passed).length,
  total: checks.length,
  buildExecuted: false,
  liveHttpTestsExecuted: false,
  productionCleared: false,
  blockers: checks.filter(c => !c.passed).map(c => c.name),
  nextActions: [
    'Generate and commit a lockfile using the agreed package manager in a network-enabled development environment.',
    'Install dependencies from the lockfile with a clean install.',
    'Run npm run build from apps/api and retain the complete output.',
    'Run the Phase 188 HTTP probe against a dedicated test API.',
  ],
  note: 'This is a preflight inventory only. It does not install packages, execute the build, contact an API, or grant production clearance.'
};
fs.writeFileSync(path.join(root, 'PHASE189_BUILD_REPRODUCIBILITY_AUDIT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 2;
