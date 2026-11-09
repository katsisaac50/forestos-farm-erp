/**
 * Controlled legacy growth migration. Dry-run by default.
 * Only migrates a sample when its blockId maps to exactly ONE scoped plantation.
 * If the same blockId occurs in multiple organizations, skip it for manual review.
 * Back up the database and resolve ambiguous ownership before enabling tenants.
 */
const mongoose=require('mongoose');
async function main(){
 if(!process.env.MONGODB_URI)throw Error('MONGODB_URI required');
 await mongoose.connect(process.env.MONGODB_URI);
 const db=mongoose.connection.db, samples=db.collection('growthsamples'), blocks=db.collection('plantations');
 const unscoped=await samples.find({$or:[{organizationId:{$exists:false}},{organizationId:null},{organizationId:''}]}).toArray();
 let eligible=0,ambiguous=0,unmatched=0,changed=0;
 for(const sample of unscoped){
  const matches=await blocks.find({blockId:sample.blockId,organizationId:{$type:'string'}}).project({organizationId:1}).toArray();
  const orgIds=[...new Set(matches.map(m=>m.organizationId))];
  if(orgIds.length!==1){if(orgIds.length>1)ambiguous++;else unmatched++;continue;}
  eligible++;
  if(process.env.CONFIRM_LEGACY_GROWTH_MIGRATION==='YES'){
   const result=await samples.updateOne({_id:sample._id,$or:[{organizationId:{$exists:false}},{organizationId:null},{organizationId:''}]},{$set:{organizationId:orgIds[0]}});
   changed+=result.modifiedCount;
  }
 }
 console.log(JSON.stringify({unscoped:unscoped.length,eligible,ambiguous,unmatched,changed,mode:process.env.CONFIRM_LEGACY_GROWTH_MIGRATION==='YES'?'apply':'dry-run'},null,2));
 if(ambiguous||unmatched)console.warn('Manual ownership review required for unresolved growth samples.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await mongoose.disconnect()});
