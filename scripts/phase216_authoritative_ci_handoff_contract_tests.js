'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspect } = require('./phase216_authoritative_ci_handoff');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forestos216-'));
try {
  const api = path.join(tmp, 'apps/api'); const wf = path.join(tmp, '.github/workflows');
  fs.mkdirSync(api, {recursive:true}); fs.mkdirSync(wf, {recursive:true});
  const manifest = {name:'forestos-api',version:'0.1.0',scripts:{build:'nest build'},dependencies:{x:'^1.0.0'},devDependencies:{},optionalDependencies:{}};
  fs.writeFileSync(path.join(api,'package.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(wf,'forestos-api-verified-build.yml'),'on:\n  workflow_dispatch:\n    inputs:\n      confirmation:\n        description: BUILD\nrun: npm ci\nrun: npm run build\n');
  let r=inspect(tmp); assert.equal(r.phase,216); assert.equal(r.assessment,'CI_HANDOFF_BLOCKED'); assert.equal(r.installExecuted,false); assert.equal(r.buildExecuted,false); assert.equal(r.productionCleared,false); assert.ok(r.blockers.some(x=>x.id==='lockfile_presence'));
  const lock={name:manifest.name,version:manifest.version,lockfileVersion:3,requires:true,packages:{'':{name:manifest.name,version:manifest.version,dependencies:manifest.dependencies,devDependencies:{},optionalDependencies:{}}}};
  fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock));
  r=inspect(tmp); assert.equal(r.assessment,'LOCAL_HANDOFF_READY_REMOTE_BUILD_NOT_RUN'); assert.equal(r.blockers.length,0); assert.ok(r.hashes.manifest); assert.ok(r.hashes.lockfile); assert.equal(r.remoteWorkflowExecuted,false);
  lock.packages[''].dependencies={x:'^2.0.0'}; fs.writeFileSync(path.join(api,'package-lock.json'),JSON.stringify(lock));
  r=inspect(tmp); assert.equal(r.assessment,'CI_HANDOFF_BLOCKED'); assert.ok(r.blockers.some(x=>x.id==='lockfile_dependency_alignment'));
  fs.writeFileSync(path.join(api,'package-lock.json'),'{bad'); r=inspect(tmp); assert.ok(r.blockers.some(x=>x.id==='lockfile_json'));
  fs.rmSync(path.join(wf,'forestos-api-verified-build.yml')); r=inspect(tmp); assert.ok(r.blockers.some(x=>x.id==='verified_build_workflow'));
  console.log('Phase 216 contract tests: 13 assertions passed');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
