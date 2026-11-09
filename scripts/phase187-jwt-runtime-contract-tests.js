#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const guard=read('apps/api/src/auth/roles.guard.ts');const moduleSource=read('apps/api/src/auth/auth.module.ts');const probe=read('scripts/phase187-jwt-runtime-contract-probe.js');
const checks=[
 ['guard uses configured JwtService for verification',()=>assert.match(guard,/verifyAsync(?:<Record<string,\s*unknown>>)?\s*\(\s*token\s*\)/)],
 ['guard does not re-read JWT_SECRET during verification',()=>assert.doesNotMatch(guard,/verifyAsync\(token,\s*\{\s*secret:\s*process\.env\.JWT_SECRET/)],
 ['module resolves validated JWT secret at startup',()=>assert.match(moduleSource,/secret:resolveJwtSecret\(process\.env\)/)],
 ['runtime probe uses timing-safe signature comparison',()=>assert.match(probe,/crypto\.timingSafeEqual/)],
 ['runtime probe checks expiry and not-before claims',()=>assert.match(probe,/expired token/) && assert.match(probe,/token not active/)],
 ['runtime probe rejects non-HS256 algorithms',()=>assert.match(probe,/unsupported algorithm/)],
 ['runtime probe checks Bearer scheme and roles',()=>assert.match(probe,/function parseBearer/) && assert.match(probe,/function requireRole/)],
 ['report states live application tests were not run',()=>{const r=JSON.parse(read('PHASE187_JWT_RUNTIME_CONTRACT_PROBE.json'));assert.equal(r.liveNestRuntimeTestsRun,false);assert.equal(r.productionCleared,false)}],
];let failed=0;for(const [name,fn] of checks){try{fn();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${e.message}`)}}console.log(`\nPhase 187 contract tests: ${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
