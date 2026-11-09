'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');let passed=0;
function ok(n,c){if(!c){console.error('FAIL '+n);process.exitCode=1;}else{passed++;console.log('PASS '+n)}}
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
for(const domain of ['sales','inventory']){
 const ctl=read(`apps/api/src/${domain}/${domain}.controller.ts`),svc=read(`apps/api/src/${domain}/${domain}.service.ts`),schema=read(`apps/api/src/${domain}/${domain==='sales'?'sales':'inventory'}.schema.ts`),mod=read(`apps/api/src/${domain}/${domain}.module.ts`);
 ok(`${domain}: controller guarded`,/@UseGuards\(AuthGuard\)/.test(ctl));
 ok(`${domain}: resolves active membership`,/resolveContext\(String\(userId\),organizationId\)/.test(ctl));
 ok(`${domain}: list uses organizationFilter`,/find\(organizationFilter\(c\)\)/.test(svc));
 ok(`${domain}: create ownership server-derived`,/organizationDocument\(c,/.test(svc));
 ok(`${domain}: update query is tenant scoped`,/findOneAndUpdate\(organizationFilter\(c,\{_id:id\}\)/.test(svc));
 ok(`${domain}: update strips client ownership`,/delete safe\.organizationId;delete safe\.createdBy/.test(svc));
 ok(`${domain}: schema has tenant owner fields`,/@Prop\(\{required:true,index:true\}\) organizationId/.test(schema)&&/@Prop\(\{required:true\}\) createdBy/.test(schema));
 ok(`${domain}: identifier unique within tenant`,new RegExp(`Schema\\.index\\(\\{organizationId:1,${domain==='sales'?'orderId':'itemId'}:1\\},\\{unique:true`).test(schema));
 ok(`${domain}: organization access module imported`,/OrganizationsModule/.test(mod));
}
const app=read('apps/api/src/app.module.ts');ok('Sales and Inventory modules registered in app',/imports:\[SalesModule,InventoryModule,/.test(app));
const pkg=JSON.parse(read('apps/api/package.json'));ok('phase 122 contract command registered',!!pkg.scripts['test:phase122:contract']);
const notes=read('PHASE122_NOTES.md');ok('migration/backfill safety is documented',/backfill/i.test(notes)&&/production/i.test(notes));
console.log(`Phase 122 contract tests: ${passed}/21 passed`);
