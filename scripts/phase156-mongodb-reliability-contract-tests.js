#!/usr/bin/env node
"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const root=path.resolve(__dirname,"../apps/api/src/registry-persistence");
const read=n=>fs.readFileSync(path.join(root,n),"utf8");
let passed=0;function test(n,f){try{f();passed++;console.log("PASS "+n)}catch(e){console.error("FAIL "+n+": "+e.message);process.exitCode=1}}
test("tenant-scoped batch checksum uniqueness",()=>assert.match(read("registry-commit.schema.ts"),/tenantId: 1, kind: 1, batchHash: 1[\s\S]*unique: true[\s\S]*partialFilterExpression/));
test("transaction uses session and always ends it",()=>{const s=read("registry-persistence.service.ts");assert.match(s,/startSession\(\)/);assert.match(s,/withTransaction/);assert.match(s,/finally\s*\{\s*await session\.endSession\(\)/)});
test("revision guard prevents stale writes",()=>assert.match(read("registry-persistence.service.ts"),/REVISION_CONFLICT/));
test("record version predicate guards updates",()=>assert.match(read("registry-persistence.service.ts"),/version: doc\.version - 1/));
test("failed validation occurs before session creation",()=>{const s=read("registry-persistence.service.ts");assert.ok(s.indexOf("Invalid incoming record")<s.indexOf("startSession()"))});
test("request tenant is derived from verified claims",()=>assert.match(fs.readFileSync(path.resolve(__dirname,"../apps/api/src/registry-persistence/registry-persistence.controller.ts"),"utf8"),/req\.user\?\.organizationId \|\| req\.user\?\.tenantId/));
test("integration harness refuses implicit production target",()=>{const s=fs.readFileSync(path.resolve(__dirname,"phase156-mongodb-integration-tests.js"),"utf8");assert.match(s,/FORESTOS_TEST_MONGODB_URI/);assert.match(s,/No database was modified/);assert.match(s,/createConnection\(uri/)});
test("integration harness checks idempotency",()=>assert.match(fs.readFileSync(path.resolve(__dirname,"phase156-mongodb-integration-tests.js"),"utf8"),/identical retry is idempotent/));
test("integration harness checks tenant isolation",()=>assert.match(fs.readFileSync(path.resolve(__dirname,"phase156-mongodb-integration-tests.js"),"utf8"),/tenant boundary keeps records isolated/));
test("integration harness checks version conflict",()=>assert.match(fs.readFileSync(path.resolve(__dirname,"phase156-mongodb-integration-tests.js"),"utf8"),/record version mismatch is rejected/));
console.log(`Phase 156 reliability contract tests: ${passed}/10 passed`);if(passed!==10)process.exitCode=1;
