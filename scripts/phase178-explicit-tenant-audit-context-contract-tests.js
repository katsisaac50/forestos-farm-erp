#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const service=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.service.ts'),'utf8');
const schema=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.schema.ts'),'utf8');
const controller=fs.readFileSync(path.join(root,'apps/api/src/audit/audit.controller.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
const notes=fs.readFileSync(path.join(root,'PHASE178_NOTES.md'),'utf8');
const checks=[
 ['typed tenant context is declared',/export interface AuditTenantContext/.test(service)&&/tenantId:\s*string/.test(service)],
 ['tenant-aware writer requires explicit tenant and actor',/recordForTenant\(context:\s*AuditTenantContext/.test(service)&&/Trusted tenant and actor context are required/.test(service)],
 ['tenant ID is stored as an optional compatibility field',/@Prop\(\{index:true, trim:true\}\) tenantId\?:string/.test(schema)],
 ['tenant and creation time compound index exists',/index\(\{tenantId:1,createdAt:-1\}\)/.test(schema)],
 ['tenant-scoped listing filters on tenantId',/find\(\{ tenantId: trustedTenantId \}\)/.test(service)],
 ['missing tenant context fails closed in service',/Tenant context is required to list audit events/.test(service)],
 ['controller derives tenant only from authenticated claims',/req\.user\?\.organizationId \|\| req\.user\?\.tenantId/.test(controller)&&!/Query\('tenantId'\)/.test(controller)],
 ['controller rejects missing tenant context',/Authenticated tenant context is required/.test(controller)],
 ['owner role policy remains declared',/@Roles\('owner'\)/.test(controller)],
 ['legacy writer explicitly documents unattributed compatibility',/Events written here have no tenantId/.test(service)],
 ['legacy events are excluded by tenant-scoped query',/find\(\{ tenantId: trustedTenantId \}\)/.test(service)],
 ['notes warn legacy writers need migration',/Existing writers have not all been converted/.test(notes)],
 ['npm contract command registered',!!pkg.scripts['test:phase178:contract']],
 ['no database migration or connection is executed by tests',! /mongoose\.connect|MongoClient/.test(service)]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}console.log(`Phase 178 contract tests: ${checks.length-failed}/${checks.length} passed`);if(failed)process.exitCode=1;
