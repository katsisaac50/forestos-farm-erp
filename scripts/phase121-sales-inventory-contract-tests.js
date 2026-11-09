'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');let passed=0;
function ok(name,cond){if(!cond){console.error('FAIL '+name);process.exitCode=1;}else{passed++;console.log('PASS '+name)}}
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
for(const domain of ['sales','inventory']){
 const service=read(`apps/api/src/${domain}/${domain}.service.ts`),schema=read(`apps/api/src/${domain}/${domain==='sales'?'sales':'inventory'}.schema.ts`);
 ok(`${domain} readiness findings superseded by scoped list`,/find\(organizationFilter\(c\)\)/.test(service));
 ok(`${domain} readiness findings superseded by scoped update`,/findOneAndUpdate\(organizationFilter\(c,\{_id:id\}\)/.test(service));
 ok(`${domain} schema now carries organizationId`,/@Prop\(\{required:true,index:true\}\) organizationId/.test(schema));
}
const notes=read('PHASE121_NOTES.md');ok('phase 121 limitations retained',/legacy-record/i.test(notes)&&/backfill/i.test(notes));
const phase122=read('PHASE122_NOTES.md');ok('phase 122 migration warning remains visible',/Do not assign all legacy records to one tenant by assumption/.test(phase122));
const pkg=JSON.parse(read('apps/api/package.json'));ok('phase 121 audit command remains available',!!pkg.scripts['audit:phase121:sales-inventory']);
ok('phase 122 follow-on test is registered',!!pkg.scripts['test:phase122:contract']);
console.log(`Phase 121 compatibility contract tests: ${passed}/10 passed`);
