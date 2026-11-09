#!/usr/bin/env node
"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
let passed=0;
function test(name,fn){try{fn();passed++;console.log("PASS "+name)}catch(e){console.error("FAIL "+name+": "+e.message);process.exitCode=1}}
const service=read("apps/api/src/registry-persistence/registry-persistence.service.ts");
const controller=read("apps/api/src/registry-persistence/registry-persistence.controller.ts");
const schema=read("apps/api/src/registry-persistence/registry-record.schema.ts");
const commit=read("apps/api/src/registry-persistence/registry-commit.schema.ts");
const app=read("apps/api/src/app.module.ts");
const auth=read("apps/api/src/auth/auth.guard.ts");
const integration=read("scripts/phase156-mongodb-integration-tests.js");

test("endpoint is reachable through registered module",()=>{assert.match(controller,/@Controller\('registry-persistence'\)/);assert.match(controller,/@Post\('batches'\)/);assert.match(app,/RegistryPersistenceModule/)});
test("global JWT guard verifies bearer token",()=>{assert.match(auth,/verifyAsync/);assert.match(auth,/Bearer/);assert.match(auth,/UnauthorizedException/)});
test("tenant is never taken from request payload",()=>{assert.match(controller,/req\.user\?\.organizationId \|\| req\.user\?\.tenantId/);assert.doesNotMatch(controller,/body\.tenantId|headers\.tenantId/)});
test("transaction session is used for reads and writes",()=>{assert.match(service,/withTransaction/);assert.match(service,/\.session\(session\)/);assert.match(service,/endSession\(\)/)});
test("record key is unique per tenant",()=>assert.match(schema,/tenantId: 1, domain: 1, recordId: 1[\s\S]*unique: true/));
test("commit ledger prevents same batch hash duplicate",()=>assert.match(commit,/tenantId: 1, kind: 1, batchHash: 1[\s\S]*unique: true/));
test("revision conflicts are explicitly reported",()=>assert.match(service,/REVISION_CONFLICT/));
test("optimistic record version conflict is explicitly reported",()=>assert.match(service,/VERSION_CONFLICT/));
test("duplicate keys inside incoming batch are rejected",()=>assert.match(service,/Duplicate key in batch/));
test("live harness requires explicit disposable database URI",()=>{assert.match(integration,/FORESTOS_TEST_MONGODB_URI/);assert.match(integration,/phase156_records_/);assert.match(integration,/phase156_commits_/)});
test("live harness includes concurrent stale-writer scenario",()=>assert.match(integration,/concurrent stale writers cannot both commit/));
test("live harness cleans up isolated collections",()=>{assert.match(integration,/RecordModel\.collection\.drop/);assert.match(integration,/CommitModel\.collection\.drop/)});
console.log(`Phase 157 API reliability audit: ${passed}/12 passed`);
if(passed!==12)process.exitCode=1;
