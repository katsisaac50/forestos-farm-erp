#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = {
  phase: 184,
  title: 'JWT Startup Safety Gate',
  generatedAt: new Date().toISOString(),
  implementation: 'apps/api/src/auth/jwt-secret-policy.js',
  integration: 'apps/api/src/auth/auth.module.ts resolves JWT_SECRET before JwtModule registration',
  requiredEnvironmentVariable: 'JWT_SECRET',
  productionMinimumCharacters: 32,
  rejects: ['missing or blank secret', 'known placeholder values', 'production secrets shorter than 32 characters', 'production repeated-character values'],
  noFallbackSecret: true,
  liveRuntimeTestsRun: false,
  productionBuildRun: false,
  releaseStatus: 'NOT_CLEARED_FOR_PRODUCTION',
  requiredFollowUp: ['configure secret through deployment secret manager', 'run NestJS build', 'test startup failure in controlled production-like process', 'run live HTTP auth and cross-tenant isolation tests']
};
fs.writeFileSync(path.join(root, 'PHASE184_JWT_STARTUP_SAFETY.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ phase: 184, output: 'PHASE184_JWT_STARTUP_SAFETY.json', releaseStatus: report.releaseStatus }, null, 2));
