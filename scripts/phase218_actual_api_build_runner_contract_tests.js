#!/usr/bin/env node
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path'); const assert = require('assert');
const { run } = require('./phase218_actual_api_build_runner');
let count = 0;
function test(name, fn) { fn(); count++; process.stdout.write(`PASS ${name}\n`); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forestos218-'));
try {
 const root = path.join(tmp, 'project'); const api = path.join(root, 'apps', 'api'); fs.mkdirSync(api, {recursive:true});
 const manifest = {name:'forestos-api',version:'0.1.0',scripts:{build:'nest build'}};
 fs.writeFileSync(path.join(api,'package.json'), JSON.stringify(manifest));
 test('missing lockfile blocks execution', () => { const rc = run(['--root',root,'--report',path.join(root,'missing.json'),'--execute']); assert.strictEqual(rc,1); const r=JSON.parse(fs.readFileSync(path.join(root,'missing.json'))); assert.strictEqual(r.status,'BLOCKED_OR_FAILED'); assert.strictEqual(r.productionCleared,false); });
 fs.writeFileSync(path.join(api,'package-lock.json'), JSON.stringify({name:'forestos-api',version:'0.1.0',lockfileVersion:3,packages:{'':{name:'forestos-api',version:'0.1.0'}}}));
 test('read-only mode validates lockfile and does not execute build', () => { const report=path.join(root,'ready.json'); const rc=run(['--root',root,'--report',report]); assert.strictEqual(rc,0); const r=JSON.parse(fs.readFileSync(report)); assert.strictEqual(r.status,'READY_NOT_EXECUTED'); assert.strictEqual(r.installOutcome,'not_run'); assert.strictEqual(r.buildOutcome,'not_run'); });
 test('mismatched lockfile identity is blocked', () => { fs.writeFileSync(path.join(api,'package-lock.json'), JSON.stringify({name:'wrong-name',version:'0.1.0',lockfileVersion:3})); const report=path.join(root,'mismatch.json'); const rc=run(['--root',root,'--report',report]); assert.strictEqual(rc,1); const r=JSON.parse(fs.readFileSync(report)); assert.strictEqual(r.status,'BLOCKED_OR_FAILED'); });
 test('report records production clearance as false', () => { const r=JSON.parse(fs.readFileSync(path.join(root,'mismatch.json'))); assert.strictEqual(r.productionCleared,false); });
 process.stdout.write(`${count}/${count} Phase 218 assertions passed\n`);
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
