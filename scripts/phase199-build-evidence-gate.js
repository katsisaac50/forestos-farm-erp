#!/usr/bin/env node
'use strict';
const fs=require('node:fs'); const path=require('node:path'); const crypto=require('node:crypto'); const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'), api=path.join(root,'apps','api');
const manifestPath=path.join(api,'package.json'), lockPath=path.join(api,'package-lock.json');
const reportPath=path.join(root,'PHASE199_BUILD_EVIDENCE_REPORT.json'); const args=process.argv.slice(2);
const runBuild=args.includes('--build'); const timeoutMs=Math.min(120000,Math.max(1000,Number(process.env.FORESTOS_PHASE199_TIMEOUT_MS)||60000));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const report={phase:199,title:'Build Evidence & Release Gate',generatedAt:new Date().toISOString(),mode:runBuild?'explicit-build':'read-only-preflight',productionCleared:false,buildExecuted:false,checks:{},blockers:[],evidence:{}};
try {
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')); report.evidence.manifest={path:'apps/api/package.json',name:manifest.name,version:manifest.version,sha256:hash(manifestPath)};
 const node=spawnSync(process.execPath,['--version'],{encoding:'utf8',timeout:3000}); report.evidence.node=node.status===0?node.stdout.trim():null;
 const npm=spawnSync('npm',['--version'],{encoding:'utf8',timeout:3000}); report.evidence.npm=npm.status===0?npm.stdout.trim():null;
 report.checks.manifestValid=Boolean(manifest.name&&manifest.version&&manifest.scripts&&manifest.scripts.build);
 report.checks.lockfileExists=fs.existsSync(lockPath);
 if(report.checks.lockfileExists){
  const lock=JSON.parse(fs.readFileSync(lockPath,'utf8')); const rp=lock.packages&&lock.packages[''];
  report.evidence.lockfile={path:'apps/api/package-lock.json',sha256:hash(lockPath),lockfileVersion:lock.lockfileVersion,packageCount:lock.packages?Object.keys(lock.packages).length:0};
  report.checks.lockfileAligned=Boolean(rp&&rp.name===manifest.name&&rp.version===manifest.version&&JSON.stringify(rp.dependencies||{})===JSON.stringify(manifest.dependencies||{})&&JSON.stringify(rp.devDependencies||{})===JSON.stringify(manifest.devDependencies||{}));
 } else report.checks.lockfileAligned=false;
 report.checks.nodeModulesExists=fs.existsSync(path.join(api,'node_modules'));
 report.checks.nestCliExists=fs.existsSync(path.join(api,'node_modules','@nestjs','cli','bin','nest.js'));
 if(!report.checks.manifestValid) report.blockers.push('API manifest is invalid or has no build script.');
 if(!report.checks.lockfileExists) report.blockers.push('apps/api/package-lock.json is missing.');
 else if(!report.checks.lockfileAligned) report.blockers.push('Lockfile root identity/dependency maps do not align with API manifest.');
 if(!report.checks.nodeModulesExists||!report.checks.nestCliExists) report.blockers.push('Installed dependencies or local Nest CLI are missing.');
 if(runBuild){
  if(report.blockers.length) { report.status='BLOCKED_BUILD_PREREQUISITES'; }
  else {
   report.buildExecuted=true; const r=spawnSync('npm',['run','build'],{cwd:api,encoding:'utf8',timeout:timeoutMs,windowsHide:true,maxBuffer:4*1024*1024});
   report.evidence.build={exitCode:r.status,signal:r.signal||null,timedOut:Boolean(r.error&&r.error.code==='ETIMEDOUT'),stdoutTail:(r.stdout||'').slice(-12000),stderrTail:(r.stderr||'').slice(-12000)};
   report.status=r.status===0?'BUILD_PASSED_PRODUCTION_STILL_NOT_CLEARED':'BUILD_FAILED_OR_TIMED_OUT';
  }
 } else report.status=report.blockers.length?'BLOCKED_BUILD_PREREQUISITES':'READY_FOR_EXPLICIT_BUILD';
} catch(e){report.status='BLOCKED_EVIDENCE_COLLECTION_ERROR';report.error=e.message;report.blockers.push(e.message);}
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
if(report.status.startsWith('BLOCKED')||report.status==='BUILD_FAILED_OR_TIMED_OUT') process.exitCode=2;
