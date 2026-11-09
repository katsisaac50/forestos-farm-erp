#!/usr/bin/env node
'use strict';
// Phase 123: read-only audit of exported legacy records. Does not connect to MongoDB or mutate data.
const fs=require('fs');
function audit(data){
 const domains=[['salesOrders','orderId','sales'],['inventoryItems','itemId','inventory']];
 const report={phase:123,mode:'READ_ONLY_EXPORT_AUDIT',databaseConnection:false,mutationsPerformed:false,summary:{records:0,missingOrganizationId:0,invalidOrganizationId:0,missingIdentifier:0,duplicateTenantIdentifiers:0,manualReview:0},domains:{},warnings:['An organizationId value alone does not prove ownership; verify provenance before backfill.','Do not drop old indexes or run a write migration from this report.']};
 for(const [key,idField,label] of domains){
  const rows=data[key]; if(!Array.isArray(rows)) throw new Error(`Expected ${key} to be an array`);
  const seen=new Map(), findings=[];
  for(const row of rows){ report.summary.records++;
   const rid=String(row._id??'(missing _id)'); const org=typeof row.organizationId==='string'?row.organizationId.trim():''; const ident=typeof row[idField]==='string'?row[idField].trim():'';
   const reasons=[];
   if(!org){report.summary.missingOrganizationId++;reasons.push('MISSING_ORGANIZATION_ID');}
   else if(!/^[a-fA-F0-9]{24}$/.test(org)){report.summary.invalidOrganizationId++;reasons.push('INVALID_ORGANIZATION_ID_FORMAT');}
   if(!ident){report.summary.missingIdentifier++;reasons.push('MISSING_'+idField.toUpperCase());}
   if(org && ident){const k=org.toLowerCase()+'::'+ident.toLowerCase();if(seen.has(k)){const prior=seen.get(k);prior.reasons.push('DUPLICATE_TENANT_IDENTIFIER');reasons.push('DUPLICATE_TENANT_IDENTIFIER');report.summary.duplicateTenantIdentifiers++;}else seen.set(k,{recordId:rid,reasons});}
   if(reasons.length){report.summary.manualReview++;findings.push({recordId:rid,identifier:ident||null,organizationId:org||null,reasons:[...new Set(reasons)]});}
  }
  report.domains[label]={sourceKey:key,records:rows.length,manualReviewCount:findings.length,findings};
 }
 return report;
}
if(require.main===module){try{const p=process.argv[2];if(!p){console.error('Usage: node phase123-legacy-tenant-data-migration-audit.js <read-only-export.json>');process.exit(2);}const data=JSON.parse(fs.readFileSync(p,'utf8'));console.log(JSON.stringify(audit(data),null,2));}catch(e){console.error('Phase 123 audit failed: '+e.message);process.exit(1);}}
module.exports={audit};
