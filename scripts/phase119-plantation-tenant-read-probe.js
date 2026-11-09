#!/usr/bin/env node
'use strict';
/**
 * Phase 119 — read-only live plantation tenant-isolation probe.
 * Requires dedicated non-production API, two tenant tokens, distinct org IDs,
 * and unique seeded blockId markers known to exist in each tenant.
 * No writes, deletes, or database changes are performed.
 */
const baseUrl=(process.env.FORESTOS_TEST_API_BASE_URL||'').replace(/\/+$/,'');
const allowNonlocal=process.env.FORESTOS_ALLOW_NONLOCAL_TEST_TARGET==='true';
function configError(msg){console.error(`CONFIG ERROR: ${msg}`);process.exit(2);}
function isLocal(value){try{return ['localhost','127.0.0.1','::1'].includes(new URL(value).hostname.replace(/^\[|\]$/g,''));}catch{return false;}}
if(!baseUrl||!/^https?:\/\//i.test(baseUrl))configError('Set FORESTOS_TEST_API_BASE_URL to a dedicated test API URL including /api.');
if(!isLocal(baseUrl)&&!allowNonlocal)configError('Non-local target blocked; opt in only for a secured non-production API.');
const config={
 A:{token:process.env.FORESTOS_TENANT_A_TOKEN,org:process.env.FORESTOS_TENANT_A_ORG_ID,marker:process.env.FORESTOS_TENANT_A_PLANTATION_MARKER},
 B:{token:process.env.FORESTOS_TENANT_B_TOKEN,org:process.env.FORESTOS_TENANT_B_ORG_ID,marker:process.env.FORESTOS_TENANT_B_PLANTATION_MARKER}
};
for(const [k,v] of Object.entries(config)){
 for(const field of ['token','org','marker'])if(!v[field])configError(`Missing Tenant ${k} ${field}; set the corresponding FORESTOS_TENANT_${k}_* environment variable.`);
}
if(config.A.org===config.B.org)configError('Tenant A and Tenant B organization IDs must differ.');
if(config.A.marker===config.B.marker)configError('Tenant A and Tenant B fixture markers must be unique.');
const endpoints=['plantations','plantations/intelligence'];
async function request(tenant,path){
 const url=`${baseUrl}/${path}`;
 const r=await fetch(url,{headers:{accept:'application/json',authorization:`Bearer ${config[tenant].token}`,'x-organization-id':config[tenant].org},signal:AbortSignal.timeout(15000)});
 const text=await r.text();let body;try{body=JSON.parse(text);}catch{body=text;}
 return {status:r.status,ok:r.ok,body,text};
}
function containsMarker(value,marker){return (typeof value==='string'?value:JSON.stringify(value)).includes(marker);}
(async()=>{
 let passed=0,failed=0;
 function check(ok,label,detail=''){if(ok){passed++;console.log(`PASS ${label}${detail?` — ${detail}`:''}`);}else{failed++;console.error(`FAIL ${label}${detail?` — ${detail}`:''}`);}}
 for(const tenant of ['A','B']){
  for(const endpoint of endpoints){
   try{
    const r=await request(tenant,endpoint);
    check(r.ok,`Tenant ${tenant} can read ${endpoint}`,`HTTP ${r.status}`);
    if(!r.ok)continue;
    check(containsMarker(r.body,config[tenant].marker),`Tenant ${tenant} response includes its seeded marker for ${endpoint}`);
    check(!containsMarker(r.body,config[tenant==='A'?'B':'A'].marker),`Tenant ${tenant} response excludes other tenant marker for ${endpoint}`);
    if(endpoint==='plantations/intelligence'&&r.body&&typeof r.body==='object'&&'organizationId'in r.body){
      check(String(r.body.organizationId)===String(config[tenant].org),`Tenant ${tenant} intelligence organizationId matches selected organization`);
    }
   }catch(e){check(false,`Tenant ${tenant} read probe for ${endpoint}`,e.message);}
  }
 }
 console.log(`\nPhase 119 read-only plantation tenant probe: ${passed} passed; ${failed} failed.`);
 console.log('Scope: only configured endpoints and seeded markers were checked. This is not proof of complete application tenant isolation.');
 if(failed)process.exitCode=1;
})();
