#!/usr/bin/env node
"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const root=path.resolve(__dirname,".."); const script=path.join(__dirname,"phase158-build-integration-preflight.js"); let passed=0;
function test(n,fn){try{fn();passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.message);process.exitCode=1}}
const source=fs.readFileSync(script,"utf8"),pkg=JSON.parse(fs.readFileSync(path.join(root,"apps/api/package.json"),"utf8"));
test("preflight covers build-critical source files",()=>{for(const f of ["main.ts","registry-persistence.module.ts","registry-persistence.controller.ts","registry-persistence.service.ts"])assert.ok(source.includes(f));});
test("preflight requires a clearly disposable test database",()=>{assert.match(source,/MongoDB test target safety/);assert.match(source,/Expected a clearly disposable test database name/);});
test("MongoDB URI is never printed",()=>{assert.match(source,/URI is redacted/);assert.doesNotMatch(source,/console\.log\([^\n]*mongoUri/);});
test("optional live probe verifies replica-set session support",()=>{assert.match(source,/--check-mongodb/);assert.match(source,/hello: 1/);assert.match(source,/logicalSessionTimeoutMinutes/);});
test("JSON report includes pass warning fail summary",()=>{assert.match(source,/summary:\{passed:/);assert.match(source,/--json/);});
test("preflight does not write to database",()=>{assert.doesNotMatch(source,/\.insertOne\(|\.updateOne\(|\.deleteOne\(|\.drop\(/);});
test("API build command remains defined",()=>assert.equal(pkg.scripts.build,"nest build"));
const run=spawnSync(process.execPath,[script,"--json"],{cwd:root,encoding:"utf8",env:{...process.env,FORESTOS_TEST_MONGODB_URI:""}});
test("preflight emits parseable JSON and exits successfully in static mode",()=>{assert.equal(run.status,0,run.stderr);const r=JSON.parse(run.stdout);assert.equal(r.phase,158);assert.ok(Array.isArray(r.checks));assert.ok(r.checks.length>=8);});
console.log(`Phase 158 preflight contract tests: ${passed}/8 passed`);if(passed!==8)process.exitCode=1;
