#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
function stable(v){return JSON.stringify(Object.fromEntries(Object.entries(v||{}).sort(([a],[b])=>a.localeCompare(b))));}
function preflight(root){
  const api=path.join(root,'apps','api'), manifestPath=path.join(api,'package.json'), lockPath=path.join(api,'package-lock.json');
  const blockers=[], checks=[];
  if(!fs.existsSync(manifestPath)) throw new Error(`API manifest not found: ${manifestPath}`);
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  checks.push({check:'api_manifest',status:'pass',name:manifest.name,version:manifest.version});
  if(!manifest.scripts || !manifest.scripts.build) blockers.push('API package.json is missing scripts.build.');
  else checks.push({check:'build_script',status:'pass',command:manifest.scripts.build});
  if(!fs.existsSync(lockPath)) { blockers.push('apps/api/package-lock.json is missing; do not claim a clean npm ci or API build until a trusted lockfile is supplied and committed.'); checks.push({check:'lockfile_presence',status:'blocked'}); }
  else {
    try {
      const lock=JSON.parse(fs.readFileSync(lockPath,'utf8')), rootPkg=lock.packages&&lock.packages[''];
      if(!rootPkg) blockers.push('Lockfile is missing packages[""] metadata.');
      if(![2,3].includes(lock.lockfileVersion)) blockers.push(`Unsupported lockfileVersion: ${lock.lockfileVersion}`);
      if(lock.name!==manifest.name || lock.version!==manifest.version || !rootPkg || rootPkg.name!==manifest.name || rootPkg.version!==manifest.version) blockers.push('Lockfile package identity/version does not match package.json.');
      for(const key of ['dependencies','devDependencies','optionalDependencies']) if(stable(rootPkg&&rootPkg[key])!==stable(manifest[key])) blockers.push(`Lockfile root ${key} does not match package.json.`);
      checks.push({check:'lockfile_alignment',status:blockers.some(x=>/Lockfile/.test(x)||/lockfileVersion/.test(x))?'blocked':'pass',lockfileVersion:lock.lockfileVersion});
    } catch(e) { blockers.push(`Lockfile cannot be parsed or validated: ${e.message}`); checks.push({check:'lockfile_alignment',status:'blocked'}); }
  }
  return {phase:214,assessment:blockers.length?'BUILD_PREFLIGHT_BLOCKED':'PREFLIGHT_PASSED_BUILD_NOT_YET_RUN',apiPackage:manifest.name||null,apiVersion:manifest.version||null,checks,blockers,actualInstallExecuted:false,actualBuildExecuted:false,productionCleared:false,note:'Static preflight only. Passing this report does not prove npm ci or NestJS compilation succeeded.'};
}
function main(argv){const arg=(n,d)=>{const i=argv.indexOf(n);return i>=0&&argv[i+1]?argv[i+1]:d}; const root=path.resolve(arg('--root',process.cwd())); const report=preflight(root); const out=JSON.stringify(report,null,2)+'\n'; const dest=arg('--report',null); if(dest)fs.writeFileSync(path.resolve(dest),out); else process.stdout.write(out); if(report.blockers.length)process.exitCode=2;}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(`Preflight failed: ${e.message}`);process.exitCode=1;}}
module.exports={preflight};
