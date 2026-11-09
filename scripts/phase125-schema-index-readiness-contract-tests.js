#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const root=path.resolve(__dirname,'..');
const audit=fs.readFileSync(path.join(__dirname,'phase125-schema-index-readiness-audit.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const sales=fs.readFileSync(path.join(root,'apps/api/src/sales/sales.schema.ts'),'utf8');
const inv=fs.readFileSync(path.join(root,'apps/api/src/inventory/inventory.schema.ts'),'utf8');
const ctl=fs.readFileSync(path.join(root,'apps/api/src/inventory-control/inventory.schema.ts'),'utf8');
const checks=[
 ['audit is read-only and has no MongoDB connection',()=>{assert.match(audit,/databaseConnection:false|does not connect to MongoDB/);assert.doesNotMatch(audit,/mongoose\.connect|MongoClient\(/)}],
 ['sales schema declares tenant-aware compound index',()=>{assert.match(sales,/organizationId:1,orderId:1/)}],
 ['inventory schema declares tenant-aware compound index',()=>{assert.match(inv,/organizationId:1,itemId:1/)}],
 ['inventory-control stock item uniqueness is tenant-scoped after Phase 127',()=>{assert.match(ctl,/StockItemSchema\.index\(\{organizationId:1,itemCode:1\},\{unique:true/);assert.doesNotMatch(ctl,/itemCode:\s*string;\s*\n\s*@Prop\(\{required:true,unique:true/) }],
 ['audit covers sales, inventory, inventory-control',()=>{for(const x of ['sales.schema.ts','inventory.schema.ts','inventory-control/inventory.schema.ts'])assert.ok(audit.includes(x))}],
 ['audit checks compound indexes',()=>assert.match(audit,/TENANT_COMPOUND_UNIQUE_INDEX_NOT_VISIBLE/)],
 ['audit checks global unique fields',()=>assert.match(audit,/GLOBAL_UNIQUE_FIELD/)],
 ['audit emits JSON report',()=>assert.match(audit,/PHASE125_SCHEMA_INDEX_READINESS\.json/)],
 ['audit includes backup preflight',()=>assert.match(audit,/restorable database backup/)],
 ['audit includes duplicate-key preflight',()=>assert.match(audit,/Detect duplicate candidate keys/)],
 ['audit requires non-production rehearsal',()=>assert.match(audit,/non-production copy/)],
 ['audit warns against premature index drops',()=>assert.match(audit,/Never drop a global unique index/)],
 ['API package exposes audit command',()=>assert.ok(pkg.scripts['audit:phase125:schema-index'])],
 ['API package exposes contract command',()=>assert.ok(pkg.scripts['test:phase125:contract'])],
 ['report explicitly says static-only',()=>assert.match(audit,/Static source scan only/)]
];
let failed=0;
for(const [name,fn] of checks){try{fn();console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+' — '+e.message)}}
console.log(`${checks.length-failed}/${checks.length} passed`);
if(failed)process.exit(1);
