#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "..");
const api = path.join(root, "apps", "api");
const checks = [];
const add = (name, status, detail) => checks.push({ name, status, detail });
const exists = p => fs.existsSync(path.join(root, p));
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const nodeMajor = Number(process.versions.node.split(".")[0]);
add("Node.js runtime", nodeMajor >= 18 ? "PASS" : "FAIL", `Detected ${process.version}; API package expects a modern Node.js runtime.`);
add("API package manifest", exists("apps/api/package.json") ? "PASS" : "FAIL", "apps/api/package.json");
add("TypeScript configuration", exists("apps/api/tsconfig.json") ? "PASS" : "FAIL", "apps/api/tsconfig.json");
add("API entry point", exists("apps/api/src/main.ts") ? "PASS" : "FAIL", "apps/api/src/main.ts");
add("Persistence module sources", ["registry-persistence.module.ts","registry-persistence.controller.ts","registry-persistence.service.ts","registry-record.schema.ts","registry-commit.schema.ts"].every(f=>fs.existsSync(path.join(api,"src","registry-persistence",f))) ? "PASS" : "FAIL", "Checks all five persistence source files.");
let pkg;
try { pkg = readJson("apps/api/package.json"); add("Package JSON parses", "PASS", `${pkg.name || "API"} ${pkg.version || ""}`.trim()); }
catch (e) { add("Package JSON parses", "FAIL", e.message); }
if (pkg) {
  const required = ["@nestjs/common","@nestjs/core","@nestjs/mongoose","mongoose","typescript"];
  const missing = required.filter(k => !(pkg.dependencies||{})[k] && !(pkg.devDependencies||{})[k]);
  add("Build dependencies declared", missing.length ? "FAIL" : "PASS", missing.length ? `Missing: ${missing.join(", ")}` : `${required.length} required packages declared.`);
  add("Build script declared", pkg.scripts && pkg.scripts.build === "nest build" ? "PASS" : "FAIL", `build=${pkg.scripts && pkg.scripts.build || "(missing)"}`);
}
add("Installed dependencies", fs.existsSync(path.join(api,"node_modules")) ? "PASS" : "WARN", fs.existsSync(path.join(api,"node_modules")) ? "apps/api/node_modules exists; build can be attempted." : "Dependencies are not installed; build was not attempted.");
const mongoUri = process.env.FORESTOS_TEST_MONGODB_URI;
if (!mongoUri) add("Disposable MongoDB test URI", "WARN", "FORESTOS_TEST_MONGODB_URI is unset; live integration tests will skip.");
else {
  let parsed;
  try { parsed = new URL(mongoUri); } catch { parsed = null; }
  const dbName = parsed ? decodeURIComponent(parsed.pathname.replace(/^\//,"")) : "";
  const safeDb = /^(test|testing|forestos_test|forestos_phase\w*|phase\w*|.*_test)$/i.test(dbName);
  add("MongoDB test target safety", parsed && /^mongodb(\+srv)?:$/.test(parsed.protocol) && safeDb ? "PASS" : "FAIL", `URI is redacted; database name=${dbName || "(unreadable)"}. Expected a clearly disposable test database name.`);
}
if (process.argv.includes("--check-mongodb") && mongoUri) {
  try {
    const mongoosePath = require.resolve("mongoose", { paths: [api, root] });
    const mongoose = require(mongoosePath);
    const run = async () => {
      const conn = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
      try {
        const hello = await conn.db.admin().command({ hello: 1 });
        const replica = Boolean(hello.setName && hello.logicalSessionTimeoutMinutes !== undefined);
        add("MongoDB connectivity", "PASS", "Connection established; URI redacted.");
        add("MongoDB transaction prerequisites", replica ? "PASS" : "FAIL", replica ? `Replica set ${hello.setName} advertises logical sessions.` : "Server did not identify as a replica set with logical sessions; multi-document transactions are not ready.");
      } finally { await conn.close(); }
    };
    run().then(() => { process.exitCode = output() ? 1 : 0; }).catch(e => { add("MongoDB connectivity", "FAIL", `${e.name}: ${e.message}`); process.exitCode = output() ? 1 : 0; });
  } catch (e) { add("MongoDB connectivity", "FAIL", `Mongoose unavailable or connection failed: ${e.message}`); }
}
function output() {
  const failed = checks.filter(c=>c.status === "FAIL").length;
  const report = { phase:158, title:"Build Verification & Live Integration Readiness Preflight", generatedAt:new Date().toISOString(), mode:process.argv.includes("--check-mongodb")?"optional-live-check":"read-only-static", summary:{passed:checks.filter(c=>c.status==="PASS").length,warnings:checks.filter(c=>c.status==="WARN").length,failed}, checks };
  if (process.argv.includes("--json")) console.log(JSON.stringify(report,null,2));
  else { for (const c of checks) console.log(`${c.status.padEnd(4)} ${c.name}: ${c.detail}`); console.log(`Phase 158 preflight: ${report.summary.passed} passed, ${report.summary.warnings} warning(s), ${failed} failed.`); }
  return failed;
}
if (!(process.argv.includes("--check-mongodb") && mongoUri)) process.exitCode = output() ? 1 : 0;
