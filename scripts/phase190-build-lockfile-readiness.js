#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api');
const pkg = JSON.parse(fs.readFileSync(path.join(api, 'package.json'), 'utf8'));
const lockPath = path.join(api, 'package-lock.json');
let lockValid = false, lockDetail = 'BLOCKER: apps/api/package-lock.json is missing';
if (fs.existsSync(lockPath)) {
  try { const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); lockValid = Boolean(lock.lockfileVersion && lock.packages); lockDetail = lockValid ? `npm lockfile v${lock.lockfileVersion} present` : 'BLOCKER: lockfile lacks expected npm structure'; }
  catch (e) { lockDetail = `BLOCKER: malformed package-lock.json (${e.message})`; }
}
const checks = [
  { name: 'API manifest parses', passed: true, detail: pkg.name },
  { name: 'npm build script declared', passed: Boolean(pkg.scripts?.build && pkg.scripts.build.includes('nest build')), detail: pkg.scripts?.build || 'missing' },
  { name: 'npm lockfile exists and is structurally valid', passed: lockValid, detail: lockDetail },
  { name: 'NestJS CLI declared', passed: Boolean(pkg.devDependencies?.['@nestjs/cli']), detail: pkg.devDependencies?.['@nestjs/cli'] || 'missing' },
  { name: 'TypeScript config exists', passed: fs.existsSync(path.join(api, 'tsconfig.json')), detail: 'apps/api/tsconfig.json' },
  { name: 'Phase 188 HTTP probe present', passed: fs.existsSync(path.join(root, 'scripts/phase188-authentication-http-smoke.js')), detail: 'source-level availability only' },
];
const report = { phase: 190, purpose: 'API npm lockfile bootstrap and clean-build readiness', generatedAt: new Date().toISOString(), packageManager: 'npm', apiPackage: pkg.name, checks, passed: checks.filter(x=>x.passed).length, total: checks.length, lockfileGeneratedByThisAudit: false, cleanInstallExecuted: false, buildExecuted: false, liveHttpTestsExecuted: false, productionCleared: false, blockers: checks.filter(x=>!x.passed).map(x=>x.name), nextActions: ['Run npm run bootstrap:phase190:lockfile from apps/api in a registry-enabled environment.', 'Review and commit apps/api/package-lock.json.', 'Run npm ci --ignore-scripts --no-audit --no-fund from apps/api.', 'Run npm run build from apps/api and capture the actual output.', 'Run the Phase 188 HTTP probe against a dedicated non-production API.'], note: 'Readiness audit only; it never installs packages, changes dependency versions, executes the build, contacts an API, or grants production clearance.' };
fs.writeFileSync(path.join(root,'PHASE190_BUILD_LOCKFILE_READINESS.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (report.passed !== report.total) process.exitCode = 2;
