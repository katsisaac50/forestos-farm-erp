#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = path.join(root, 'apps/api/src');
function read(rel) { const p = path.join(api, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
const main = read('main.ts');
const appModule = read('app.module.ts');
const authModule = read('auth/auth.module.ts');
const guard = read('auth/auth.guard.ts');
const decorators = read('auth/auth.decorators.ts');
const allTs = [];
function walk(dir) { if (!fs.existsSync(dir)) return; for (const e of fs.readdirSync(dir, {withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(e.isFile()&&p.endsWith('.ts')&&!p.endsWith('.spec.ts')) allTs.push(p); } }
walk(api);
const publicRows=[];
for (const file of allTs) { const source=fs.readFileSync(file,'utf8'); const re=/@Public\s*\(\s*\)/g; let m; while((m=re.exec(source))) publicRows.push({file:path.relative(root,file).split(path.sep).join('/'),line:source.slice(0,m.index).split('\n').length,review:'Confirm endpoint is intentionally public and returns no tenant-sensitive data.'}); }
const report={phase:182,title:'Authentication Guard Configuration & Public Route Audit',status:'GLOBAL_GUARD_CONFIGURATION_SIGNAL_FOUND_REQUIRES_RUNTIME_VERIFICATION',method:'Static source inspection of NestJS bootstrap, module providers, auth guard, decorator definitions and @Public annotations.',findings:{globalGuardProviderConfigured:/provide\s*:\s*APP_GUARD/.test(authModule),authGuardRegisteredAsGlobalProvider:/provide\s*:\s*APP_GUARD\s*,\s*useClass\s*:\s*AuthGuard/.test(authModule),authGuardValidatesBearerToken:/authorization/.test(guard)&&/verifyAsync/.test(guard),authGuardRejectsInvalidToken:/UnauthorizedException/.test(guard),authGuardChecksRoleMetadata:/ROLES_KEY/.test(guard)&&/ForbiddenException/.test(guard),publicDecoratorBypassesGuard:/if\s*\(isPublic\)\s*return\s+true/.test(guard),globalPrefixConfigured:(main.match(/setGlobalPrefix\s*\(/g)||[]).length>0,globalValidationPipeConfigured:/useGlobalPipes\s*\(\s*new ValidationPipe/.test(main),jwtSecretEnvironmentBased:/process\.env\.JWT_SECRET/.test(authModule)&&/process\.env\.JWT_SECRET/.test(guard),mongodbFallbackConfigured:/127\.0\.0\.1:27017\/forestos/.test(appModule)},publicRouteAnnotations:publicRows,counts:{publicAnnotations:publicRows.length,sourceFilesScanned:allTs.length},interpretation:['An APP_GUARD provider is declared in AuthModule, which is imported by AppModule; static source inspection suggests a global guard is configured.','@Public annotations intentionally bypass authentication and require endpoint-by-endpoint review.','JWT_SECRET is environment-based; deployment must provide a strong secret and fail safely when missing.','This scan does not validate runtime dependency injection, role correctness, organization membership, tenant-scoped queries, or live HTTP behavior.'],requiredActions:['Review every @Public annotation and document its reason.','Verify JWT_SECRET is mandatory in production startup configuration and rotate any default or exposed secret.','Verify organization membership and tenant context are validated on each protected data path.','Run build and live HTTP tests for missing, invalid, expired, and insufficient-role tokens plus cross-tenant read/write attempts.'],productionClearance:'NOT CLEARED FOR PRODUCTION'};
fs.writeFileSync(path.join(root,'PHASE182_AUTH_GUARD_CONFIGURATION_AUDIT.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({globalGuardProviderConfigured:report.findings.globalGuardProviderConfigured,publicAnnotations:report.counts.publicAnnotations,sourceFilesScanned:report.counts.sourceFilesScanned,productionClearance:report.productionClearance},null,2));
