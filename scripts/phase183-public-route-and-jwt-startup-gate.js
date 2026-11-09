#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const apiRoot = path.join(root, 'apps/api/src');
const tsFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && full.endsWith('.ts') && !full.endsWith('.spec.ts')) tsFiles.push(full);
  }
}
walk(apiRoot);
function rel(file) { return path.relative(root, file).split(path.sep).join('/'); }
function lineAt(source, index) { return source.slice(0, index).split('\n').length; }
function nearbyMethod(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  const start = Math.max(0, lines.length - 18);
  const context = lines.slice(start).join('\n');
  const matches = [...context.matchAll(/(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*\{/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}
const publicRoutes = [];
for (const file of tsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const re = /@Public\s*\(\s*\)/g;
  let m;
  while ((m = re.exec(source))) {
    const before = source.slice(0, m.index);
    const lastController = [...before.matchAll(/@Controller\s*\(([^)]*)\)/g)].pop();
    const lastHttp = [...before.matchAll(/@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)/g)].pop();
    const method = nearbyMethod(source, m.index);
    const blockStart = Math.max(0, m.index - 420);
    const block = source.slice(blockStart, Math.min(source.length, m.index + 650));
    const routeDecorators = [...block.matchAll(/@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)/g)];
    const route = routeDecorators.length ? routeDecorators[0][0] : (lastHttp ? lastHttp[0] : null);
    publicRoutes.push({file:rel(file),line:lineAt(source,m.index),controller:lastController?lastController[1].trim():null,method,nearbyHttpDecorator:route,reviewStatus:'REQUIRES_HUMAN_APPROVAL',reviewQuestions:['Is public access required for this endpoint?','Does the response or side effect expose or modify tenant-scoped data?','Is rate limiting, input validation and abuse protection applied?','Is there a documented owner and reason for bypassing authentication?']});
  }
}
const authModulePath = path.join(apiRoot, 'auth/auth.module.ts');
const guardPath = path.join(apiRoot, 'auth/roles.guard.ts');
const authModule = fs.existsSync(authModulePath) ? fs.readFileSync(authModulePath,'utf8') : '';
const guard = fs.existsSync(guardPath) ? fs.readFileSync(guardPath,'utf8') : '';
const jwtPolicyPath = path.join(apiRoot, 'auth/jwt-secret-policy.ts');
const jwtPolicy = fs.existsSync(jwtPolicyPath) ? fs.readFileSync(jwtPolicyPath, 'utf8') : '';
const appModulePath = path.join(apiRoot,'app.module.ts');
const appModule = fs.existsSync(appModulePath) ? fs.readFileSync(appModulePath,'utf8') : '';
const mainPath = path.join(apiRoot,'main.ts');
const main = fs.existsSync(mainPath) ? fs.readFileSync(mainPath,'utf8') : '';
const configFiles = tsFiles.filter(f => /config|auth\.module|auth\.guard|main\.ts/i.test(f)).map(f=>({file:rel(f),jwtSecretReferences:(fs.readFileSync(f,'utf8').match(/JWT_SECRET/g)||[]).length,productionGuardSignals:(fs.readFileSync(f,'utf8').match(/NODE_ENV/g)||[]).length}));
const report = {
  phase:183,
  title:'Public Route Review Register & JWT Startup Safety Gate',
  status:'STATIC_REVIEW_COMPLETE_RUNTIME_VERIFICATION_REQUIRED',
  method:'Static source inspection only. No source code is automatically changed; no network or database calls are made.',
  publicRoutes,
  jwtStartupReview:{
    authModuleExists:!!authModule,
    guardExists:!!guard,
    appModuleExists:!!appModule,
    mainExists:!!main,
    environmentSecretReferences:[(authModule.match(/JWT_SECRET/g)||[]).length,(guard.match(/JWT_SECRET/g)||[]).length].reduce((a,b)=>a+b,0),
    evidenceOfExplicitMissingSecretStartupFailure:
      /resolveJwtSecret\s*\(\s*process\.env\s*\)/.test(authModule) &&
      /if\s*\(\s*!secret\s*\)|if\s*\(\s*!secret\s*\)/.test(jwtPolicy) &&
      /throw new Error\s*\(/.test(jwtPolicy),
    evidenceOfProductionSpecificSecretGate:
      /environment\s*===\s*['"]production['"]/.test(jwtPolicy) &&
      /secret\.length\s*<\s*32/.test(jwtPolicy),
    note:'Static regular-expression checks are indicators only; verify configuration and failure behavior by executing startup tests in a controlled environment.'
  },
  counts:{sourceFilesScanned:tsFiles.length,publicAnnotations:publicRoutes.length,publicRoutesNeedingApproval:publicRoutes.length},
  requiredActions:[
    'Assign an owner and documented business justification to every public route; approve or remove each bypass explicitly.',
    'For each public route, test response data and side effects for tenant-sensitive access, abuse resistance, rate limits and validation.',
    'Add controlled startup tests proving the API refuses to start in production when JWT_SECRET is absent or insecure.',
    'Test missing, malformed, invalid, expired and insufficient-role tokens using live HTTP requests.',
    'Verify tenant membership and tenant-scoped reads and writes independently of authentication.'
  ],
  productionClearance:'NOT CLEARED FOR PRODUCTION'
};
fs.writeFileSync(path.join(root,'PHASE183_PUBLIC_ROUTE_JWT_STARTUP_GATE.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({phase:report.phase,sourceFilesScanned:report.counts.sourceFilesScanned,publicAnnotations:report.counts.publicAnnotations,explicitMissingSecretStartupFailure:report.jwtStartupReview.evidenceOfExplicitMissingSecretStartupFailure,productionClearance:report.productionClearance},null,2));
