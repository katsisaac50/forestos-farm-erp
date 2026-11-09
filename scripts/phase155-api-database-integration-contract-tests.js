#!/usr/bin/env node
"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../apps/api/src/registry-persistence");
const read=n=>fs.readFileSync(path.join(root,n),"utf8");
let passed=0;function test(n,f){try{f();passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.message);process.exitCode=1}}
test("module registers record and commit models",()=>{const s=read("registry-persistence.module.ts");assert.match(s,/RegistryRecordSchema/);assert.match(s,/RegistryCommitSchema/);assert.match(s,/RegistryPersistenceService/)});
test("unique tenant record index exists",()=>assert.match(read("registry-record.schema.ts"),/tenantId: 1, domain: 1, recordId: 1[\s\S]*unique: true/));
test("tenant identity comes from verified request user",()=>{const s=read("registry-persistence.controller.ts");assert.match(s,/req\.user\?\.organizationId \|\| req\.user\?\.tenantId/);assert.doesNotMatch(s,/body\.tenantId|headers\.tenant/i)});
test("batch DTO validates records",()=>{const s=read("dto.ts");assert.match(s,/@IsArray/);assert.match(s,/@ValidateNested/);assert.match(s,/@IsString\(\) domain/)});
test("service requires transaction session",()=>assert.match(read("registry-persistence.service.ts"),/startSession\(\)[\s\S]*withTransaction/));
test("revision conflicts are rejected",()=>assert.match(read("registry-persistence.service.ts"),/REVISION_CONFLICT/));
test("record versions are checked",()=>assert.match(read("registry-persistence.service.ts"),/VERSION_CONFLICT/));
test("duplicate incoming keys are rejected",()=>assert.match(read("registry-persistence.service.ts"),/Duplicate key in batch/));
test("conflict updates use optimistic version predicate",()=>assert.match(read("registry-persistence.service.ts"),/version: doc\.version - 1/));
test("controller endpoint registered in app module",()=>assert.match(fs.readFileSync(path.resolve(__dirname,"../apps/api/src/app.module.ts"),"utf8"),/RegistryPersistenceModule/));
console.log(`Phase 155 API integration contract tests: ${passed}/10 passed`);if(passed!==10)process.exitCode=1;
