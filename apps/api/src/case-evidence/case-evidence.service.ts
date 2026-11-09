import {BadRequestException,Injectable,NotFoundException,InternalServerErrorException,StreamableFile} from '@nestjs/common';
import {createHash,randomUUID} from 'crypto';
import {mkdir,writeFile,readFile,unlink,readdir,stat} from 'fs/promises';
import {basename,join,resolve} from 'path';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {CaseEvidence} from './case-evidence.schema';
import {CaseEvidenceEvent} from './case-evidence-event.schema';
import {FinancialInvestigationCase} from '../financial-investigation-cases/financial-investigation-case.schema';
import {EvidenceRecoveryIncident} from './evidence-recovery-incident.schema';
import {RecoveryEscalationEvent} from './recovery-escalation-event.schema';
import {ConflictException,OnModuleInit,OnModuleDestroy} from '@nestjs/common';
import {RecoverySchedulerState} from './recovery-scheduler-state.schema';
@Injectable()
export class CaseEvidenceService implements OnModuleInit,OnModuleDestroy {
 private schedulerTimer?:ReturnType<typeof setInterval>;
 private readonly schedulerInstance=randomUUID();
 constructor(@InjectModel(CaseEvidence.name) private evidence:Model<CaseEvidence>,@InjectModel(CaseEvidenceEvent.name) private events:Model<CaseEvidenceEvent>,@InjectModel(FinancialInvestigationCase.name) private cases:Model<FinancialInvestigationCase>,@InjectModel(EvidenceRecoveryIncident.name) private incidents:Model<EvidenceRecoveryIncident>,@InjectModel(RecoveryEscalationEvent.name) private escalationEvents:Model<RecoveryEscalationEvent>,@InjectModel(RecoverySchedulerState.name) private schedulerState:Model<RecoverySchedulerState>){}
 onModuleInit(){
  if(process.env.RECOVERY_ESCALATION_SCHEDULER_ENABLED!=='true')return;
  const minutes=Math.max(5,Math.min(1440,Number(process.env.RECOVERY_ESCALATION_INTERVAL_MINUTES)||15));
  this.schedulerTimer=setInterval(()=>{void this.runScheduledRecoveryEvaluation().catch(()=>undefined)},minutes*60*1000);
  (this.schedulerTimer as any).unref?.();
 }
 onModuleDestroy(){if(this.schedulerTimer)clearInterval(this.schedulerTimer)}
 async getRecoverySchedulerStatus(){
  const enabled=process.env.RECOVERY_ESCALATION_SCHEDULER_ENABLED==='true';
  const minutes=Math.max(5,Math.min(1440,Number(process.env.RECOVERY_ESCALATION_INTERVAL_MINUTES)||15));
  const state=await this.schedulerState.findById('recovery-escalation-evaluator').lean();
  return {enabled,intervalMinutes:minutes,leaseDurationSeconds:120,worker:'recovery-escalation-evaluator',lastRunAt:state?.lastRunAt||null,lastStatus:state?.lastStatus||null,lastError:state?.lastError||null,runCount:state?.runCount||0,note:enabled?'Scheduled evaluation is enabled. Events are internal logs only; no external notifications are sent.':'Scheduler is disabled. Set RECOVERY_ESCALATION_SCHEDULER_ENABLED=true to enable.'};
 }
 private async runScheduledRecoveryEvaluation(){
  const now=new Date();const leaseUntil=new Date(now.getTime()+120000);
  let claimed:any;
  try{claimed=await this.schedulerState.findOneAndUpdate({_id:'recovery-escalation-evaluator',$or:[{leaseUntil:{$lte:now}},{leaseUntil:{$exists:false}}]},{$set:{ownerToken:this.schedulerInstance,leaseUntil},$setOnInsert:{runCount:0}},{upsert:true,new:true,setDefaultsOnInsert:true}).lean()}
  catch(err:any){if(err?.code===11000)return;throw err}
  if(!claimed||claimed.ownerToken!==this.schedulerInstance)return;
  try{
   await this.runRecoveryEscalationEvaluation('system:scheduled-worker',7);
   await this.processQueuedNotifications('system:scheduled-worker',25);
   await this.schedulerState.updateOne({_id:'recovery-escalation-evaluator',ownerToken:this.schedulerInstance},{$set:{lastRunAt:new Date(),lastStatus:'success',lastError:null,leaseUntil:new Date(0)},$inc:{runCount:1}});
  }catch(err:any){
   const message=String(err?.message||'Unknown scheduler error').slice(0,500);
   await this.schedulerState.updateOne({_id:'recovery-escalation-evaluator',ownerToken:this.schedulerInstance},{$set:{lastRunAt:new Date(),lastStatus:'failed',lastError:message,leaseUntil:new Date(0)},$inc:{runCount:1}});
  }
 }
 private storageDir(){return resolve(process.env.EVIDENCE_STORAGE_DIR||join(process.cwd(),'private-evidence'))}
 private identifyContent(buffer:Buffer):string{
  if(buffer.length>=5&&buffer.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
  if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return 'image/jpeg';
  throw new BadRequestException('Unsupported file content. Only PDF, PNG, and JPEG files are accepted.');
 }
 async uploadFile(caseId:string,evidenceCode:string,description:string|undefined,actor:string,file:any){
  if(!caseId?.trim()||!evidenceCode?.trim())throw new BadRequestException('caseId and evidenceCode are required');
  if(!file?.buffer?.length)throw new BadRequestException('A file is required');
  if(file.buffer.length>10*1024*1024)throw new BadRequestException('Maximum file size is 10 MB');
  const c=await this.cases.findById(caseId).lean();if(!c)throw new NotFoundException('Investigation case not found');
  const mimeType=this.identifyContent(file.buffer);
  const safeName=basename(String(file.originalname||'evidence')).replace(/[\\\\/\\x00-\\x1f\\x7f]/g,'_').slice(0,180)||'evidence';
  const storedFileName=randomUUID()+'.bin';
  const sha256=createHash('sha256').update(file.buffer).digest('hex');
  const dir=this.storageDir();await mkdir(dir,{recursive:true,mode:0o700});
  const filePath=join(dir,storedFileName);
  await writeFile(filePath,file.buffer,{flag:'wx',mode:0o600});
  let record:any;
  try{
   record=await this.evidence.create({caseId:String(c._id),caseCode:c.caseCode,evidenceCode:evidenceCode.trim(),originalFileName:safeName,storedFileName,mimeType,sizeBytes:file.buffer.length,sha256,uploadedBy:actor,status:'active',description:description?.trim()||undefined});
   await this.events.create({evidenceId:String(record._id),evidenceCode:record.evidenceCode,eventType:'uploaded',actor,reason:'Private file stored; SHA-256 calculated from uploaded bytes',sha256});
   return record.toObject();
  }catch(err){
   if(record){try{await this.evidence.deleteOne({_id:record._id})}catch{}}
   try{await unlink(filePath)}catch{}
   throw err;
  }
 }
 async downloadFile(id:string){
  const r=await this.evidence.findById(id);if(!r)throw new NotFoundException('Evidence not found');
  if(r.status!=='active')throw new BadRequestException('Only active evidence can be downloaded');
  const filePath=join(this.storageDir(),basename(r.storedFileName));
  let bytes:Buffer;
  try{bytes=await readFile(filePath)}catch{throw new NotFoundException('Private evidence file is missing from storage')}
  const actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==r.sha256||bytes.length!==r.sizeBytes){
   r.status='quarantined';await r.save();
   await this.events.create({evidenceId:String(r._id),evidenceCode:r.evidenceCode,eventType:'quarantined',actor:'system:integrity-check',reason:'Integrity verification failed during download; file withheld',sha256:actual});
   throw new InternalServerErrorException('Evidence integrity verification failed. The file was quarantined and withheld.');
  }
  const safeDownloadName=basename(r.originalFileName).replace(/["\\\\\\r\\n]/g,'_').slice(0,180)||'evidence';
  return {stream:new StreamableFile(bytes,{type:r.mimeType,disposition:'attachment; filename="'+safeDownloadName+'"'}),mimeType:r.mimeType,fileName:safeDownloadName};
 }
 async listEscalationEvents(limit=100, filters:any={}){
  const bounded=Math.max(1,Math.min(500,Math.floor(Number(limit)||100)));
  const query:any={};
  const status=String(filters.status||'').trim();
  if(['queued','suppressed','failed','sent','logged_only'].includes(status))query.deliveryStatus=status;
  const incidentCode=String(filters.incidentCode||'').trim().slice(0,80);
  if(incidentCode)query.incidentCode={$regex:incidentCode.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'$options':'i'};
  const from=filters.from?new Date(filters.from):null; const to=filters.to?new Date(filters.to):null;
  if((from&&!Number.isNaN(from.getTime()))||(to&&!Number.isNaN(to.getTime()))){query.createdAt={};if(from&&!Number.isNaN(from.getTime()))query.createdAt.$gte=from;if(to&&!Number.isNaN(to.getTime()))query.createdAt.$lte=to;}
  return this.escalationEvents.find(query).sort({createdAt:-1}).limit(bounded).lean();
 }
 async getNotificationAuditSummary(){
  const since=new Date(Date.now()-24*60*60*1000);
  const [statusGroups,providerGroups,recent,failedTotal,sentTotal,total]=await Promise.all([
   this.escalationEvents.aggregate([{$group:{_id:'$deliveryStatus',count:{$sum:1}}}]),
   this.escalationEvents.aggregate([{$group:{_id:{$ifNull:['$providerName','internal_log']},count:{$sum:1}}}]),
   this.escalationEvents.countDocuments({createdAt:{$gte:since}}),
   this.escalationEvents.countDocuments({deliveryStatus:'failed'}),
   this.escalationEvents.countDocuments({deliveryStatus:'sent'}),
   this.escalationEvents.countDocuments({})
  ]);
  const statuses:any={queued:0,failed:0,sent:0,suppressed:0,logged_only:0};for(const row of statusGroups)statuses[row._id]=row.count;
  const providerBreakdown:any={};for(const row of providerGroups)providerBreakdown[row._id]=row.count;
  return {generatedAt:new Date().toISOString(),since24Hours:recent,total,statuses,providerBreakdown,deliverySuccessRate:sentTotal+failedTotal?Number((sentTotal/(sentTotal+failedTotal)*100).toFixed(1)):null,failedUnresolved:statuses.failed,warning:statuses.failed?'Failed events require review. Success indicates provider HTTP acceptance only.':'No currently failed events. Success indicates provider HTTP acceptance only.'};
 }
 async getNotificationProviderHealth(){
  const raw=String(process.env.RECOVERY_NOTIFICATION_WEBHOOK_URL||'').trim();
  let configured=false;let secure=false;let host:string|null=null;let configurationError:string|null=null;
  if(raw){try{const u=new URL(raw);configured=['https:','http:'].includes(u.protocol);secure=u.protocol==='https:';host=u.host;if(!configured)configurationError='Only HTTPS endpoints are permitted, except localhost HTTP for development.';if(u.protocol==='http:'&&!['localhost','127.0.0.1','::1'].includes(u.hostname)){secure=false;configurationError='HTTP is only permitted for localhost development.';}}catch{configurationError='Configured webhook URL is invalid.'}}
  const [queued,failed,sent,staleFailures,lastFailure]=await Promise.all([
   this.escalationEvents.countDocuments({deliveryStatus:'queued'}),
   this.escalationEvents.countDocuments({deliveryStatus:'failed'}),
   this.escalationEvents.countDocuments({deliveryStatus:'sent'}),
   this.escalationEvents.countDocuments({deliveryStatus:'failed',updatedAt:{$lt:new Date(Date.now()-60*60*1000)}}),
   this.escalationEvents.findOne({deliveryStatus:'failed'}).sort({updatedAt:-1}).select({updatedAt:1,lastError:1,incidentCode:1,attemptCount:1}).lean()
  ]);
  return {generatedAt:new Date().toISOString(),provider:raw?'webhook':'internal_log_only',configured:!!raw,urlValid:configured,secure:secure||!!(raw&&(()=>{try{return ['localhost','127.0.0.1','::1'].includes(new URL(raw).hostname)&&new URL(raw).protocol==='http:'}catch{return false}})()),host,configurationError,counts:{queued,failed,sent,staleFailures},maxAttempts:Math.max(1,Math.min(10,Number(process.env.RECOVERY_NOTIFICATION_MAX_ATTEMPTS)||5)),lastFailure:lastFailure?{at:(lastFailure as any).updatedAt,incidentCode:lastFailure.incidentCode,attemptCount:lastFailure.attemptCount,error:lastFailure.lastError}:null,health:configurationError?'configuration_error':!raw?'not_configured':failed?'degraded':'configured',note:'Configuration checks do not send a test message. HTTP 2xx indicates provider acceptance, not recipient delivery.'};
 }
 async replayFailedNotification(id:string,actor:string,reason:string){
  const why=String(reason||'').trim();if(why.length<10)throw new BadRequestException('A replay reason of at least 10 characters is required.');if(why.length>500)throw new BadRequestException('Replay reason must be 500 characters or fewer.');
  const current:any=await this.escalationEvents.findById(id).lean();if(!current)throw new NotFoundException('Notification event not found.');if(current.deliveryStatus!=='failed')throw new ConflictException('Only failed notifications can be manually replayed.');
  const now=new Date();const updated:any=await this.escalationEvents.findOneAndUpdate({_id:id,deliveryStatus:'failed'},{$set:{deliveryStatus:'queued',nextAttemptAt:now,lastReplayReason:why,lastReplayedBy:actor,lastReplayedAt:now},$inc:{manualReplayCount:1}},{new:true}).lean();
  if(!updated)throw new ConflictException('Notification status changed during replay; refresh and review the event.');
  return {ok:true,eventId:String(updated._id),incidentCode:updated.incidentCode,status:updated.deliveryStatus,manualReplayCount:updated.manualReplayCount,replayedBy:actor,replayedAt:now,reason:why,note:'Queued for delivery; this action does not itself send the notification. Provider acceptance and recipient delivery are distinct.'};
 }
 async getNotificationDeliveryStatus(){
  const configured=!!process.env.RECOVERY_NOTIFICATION_WEBHOOK_URL;
  const [queued,failed,sent,loggedOnly]=await Promise.all([
   this.escalationEvents.countDocuments({deliveryStatus:'queued'}),
   this.escalationEvents.countDocuments({deliveryStatus:'failed'}),
   this.escalationEvents.countDocuments({deliveryStatus:'sent'}),
   this.escalationEvents.countDocuments({deliveryStatus:'logged_only'})
  ]);
  return {provider:configured?'webhook':'internal_log_only',configured,endpointConfigured:configured,counts:{queued,failed,sent,loggedOnly},maxAttempts:Math.max(1,Math.min(10,Number(process.env.RECOVERY_NOTIFICATION_MAX_ATTEMPTS)||5)),note:configured?'A webhook endpoint is configured. Events are marked sent only after the endpoint returns a 2xx response. Verify that the endpoint is an authorized email/notification service.':'No delivery endpoint configured; evaluations are recorded internally and no external messages are sent.'};
 }
 async processQueuedNotifications(actor:string,limit=25){
  const maxBatch=Math.max(1,Math.min(100,Math.floor(Number(limit)||25)));
  const endpoint=String(process.env.RECOVERY_NOTIFICATION_WEBHOOK_URL||'').trim();
  const token=String(process.env.RECOVERY_NOTIFICATION_WEBHOOK_TOKEN||'').trim();
  if(!endpoint)return {provider:'internal_log_only',processed:0,sent:0,failed:0,skipped:true,note:'Set RECOVERY_NOTIFICATION_WEBHOOK_URL to enable delivery.'};
  let parsed:URL;try{parsed=new URL(endpoint)}catch{return {provider:'webhook',processed:0,sent:0,failed:0,skipped:true,error:'RECOVERY_NOTIFICATION_WEBHOOK_URL is not a valid URL.'}}
  if(!['https:','http:'].includes(parsed.protocol)|| (parsed.protocol==='http:'&&!['localhost','127.0.0.1','::1'].includes(parsed.hostname)))return {provider:'webhook',processed:0,sent:0,failed:0,skipped:true,error:'Webhook must use HTTPS. HTTP is allowed only for localhost testing.'};
  const maxAttempts=Math.max(1,Math.min(10,Number(process.env.RECOVERY_NOTIFICATION_MAX_ATTEMPTS)||5));
  const now=new Date();
  const batch:any[]=await this.escalationEvents.find({deliveryStatus:{$in:['queued','failed']},attemptCount:{$lt:maxAttempts},$or:[{nextAttemptAt:{$lte:now}},{nextAttemptAt:{$exists:false}}]}).sort({createdAt:1}).limit(maxBatch).lean();
  let sent=0,failed=0,processed=0;
  for(const item of batch){
   const claim=await this.escalationEvents.findOneAndUpdate({_id:item._id,deliveryStatus:{$in:['queued','failed']},attemptCount:{$lt:maxAttempts},$or:[{nextAttemptAt:{$lte:new Date()}},{nextAttemptAt:{$exists:false}}]},{$set:{deliveryStatus:'queued',providerName:'webhook',lastError:undefined,nextAttemptAt:new Date(Date.now()+60000)},$inc:{attemptCount:1}},{new:true}).lean();
   if(!claim)continue;
   processed++;
   try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
    let response:Response;
    try{response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','accept':'application/json',...(token?{'authorization':`Bearer ${token}`}:{})},body:JSON.stringify({eventId:String(claim._id),dedupeKey:claim.dedupeKey,incidentId:claim.incidentId,incidentCode:claim.incidentCode,alertType:claim.alertType,recipient:claim.recipient,channel:'email_notification_webhook',message:claim.message,evaluatedAt:claim.evaluatedAt,dueDate:claim.dueDate||null,daysOverdue:claim.daysOverdue||0,attempt:claim.attemptCount,actor}),signal:controller.signal});}
    finally{clearTimeout(timer)}
    if(!response.ok)throw new Error(`Provider returned HTTP ${response.status}`);
    await this.escalationEvents.updateOne({_id:claim._id,deliveryStatus:'queued'},{$set:{deliveryStatus:'sent',deliveredAt:new Date(),lastError:undefined,nextAttemptAt:undefined,channel:'webhook'}});sent++;
   }catch(err:any){
    const attempts=Number(claim.attemptCount)||1;const retryDelay=Math.min(360,Math.pow(2,Math.max(0,attempts-1))*5);const message=String(err?.name==='AbortError'?'Provider request timed out':err?.message||'Unknown provider error').slice(0,500);
    await this.escalationEvents.updateOne({_id:claim._id,deliveryStatus:'queued'},{$set:{deliveryStatus:'failed',lastError:message,nextAttemptAt:attempts<maxAttempts?new Date(Date.now()+retryDelay*60000):undefined,providerName:'webhook'}});failed++;
   }
  }
  return {provider:'webhook',processed,sent,failed,skipped:false,maxAttempts,note:'Sent means the configured endpoint returned a 2xx HTTP response; it does not independently prove that an end-user read the message.'};
 }
 async retryFailedNotifications(limit=25){
  const maxAttempts=Math.max(1,Math.min(10,Number(process.env.RECOVERY_NOTIFICATION_MAX_ATTEMPTS)||5));
  const now=new Date();
  const result=await this.escalationEvents.updateMany({deliveryStatus:'failed',attemptCount:{$lt:maxAttempts},$or:[{nextAttemptAt:{$lte:now}},{nextAttemptAt:{$exists:false}}]},{$set:{deliveryStatus:'queued',nextAttemptAt:now}});
  return {...await this.processQueuedNotifications('owner:manual-retry',limit),requeued:result.modifiedCount||0};
 }
 async runRecoveryEscalationEvaluation(actor:string,daysAhead=7){
  const now=new Date();const days=Math.max(1,Math.min(30,Math.floor(Number(daysAhead)||7)));
  const cutoff=new Date(now.getTime()+days*86400000);
  const incidents:any[]=await this.incidents.find({status:{$ne:'closed'}}).sort({dueDate:1,updatedAt:1}).limit(1000).lean();
  const proposed:any[]=[];
  const deliveryConfigured=!!process.env.RECOVERY_NOTIFICATION_WEBHOOK_URL;
  for(const r of incidents){
   const due=r.dueDate?new Date(r.dueDate):null;
   const overdue=!!(due&&!Number.isNaN(due.getTime())&&due<now);
   const daysOverdue=overdue?Math.floor((now.getTime()-due!.getTime())/86400000):0;
   let alertType:string|undefined;
   if(overdue&&r.severity==='critical')alertType='critical_overdue';
   else if(overdue)alertType='overdue';
   else if(due&&due>=now&&due<=cutoff)alertType='due_soon';
   else if(!r.assignedTo?.trim())alertType='unassigned';
   else if(r.status==='awaiting_approval')alertType='approval_waiting';
   if(!alertType)continue;
   const recipient=String(r.assignedTo||'unassigned').trim();
   const bucket=alertType==='due_soon'?due!.toISOString().slice(0,10):alertType==='overdue'||alertType==='critical_overdue'?`${Math.max(1,daysOverdue)}d`:now.toISOString().slice(0,10);
   const dedupeKey=`${String(r._id)}:${alertType}:${recipient}:${bucket}`;
   const message=alertType==='critical_overdue'?`CRITICAL recovery incident ${r.incidentCode} is overdue by ${daysOverdue} day(s). Escalate to management.`:
    alertType==='overdue'?`Recovery incident ${r.incidentCode} is overdue by ${daysOverdue} day(s). Review and update its recovery plan.`:
    alertType==='due_soon'?`Recovery incident ${r.incidentCode} is due on ${due!.toISOString().slice(0,10)}. Confirm progress.`:
    alertType==='unassigned'?`Recovery incident ${r.incidentCode} has no assigned owner. Assign an accountable person.`:
    `Recovery incident ${r.incidentCode} is awaiting approval. Arrange independent review.`;
   proposed.push({incidentId:String(r._id),incidentCode:r.incidentCode,alertType,recipient,channel:deliveryConfigured?'webhook':'internal_log',deliveryStatus:deliveryConfigured?'queued':'logged_only',message,dedupeKey,evaluatedAt:now,dueDate:due||undefined,daysOverdue:overdue?daysOverdue:undefined,attemptCount:0,providerName:deliveryConfigured?'webhook':undefined});
  }
  const created:any[]=[];let duplicates=0;
  for(const event of proposed){
   try{const saved=await this.escalationEvents.create(event);created.push(saved.toObject())}
   catch(err:any){if(err?.code===11000){duplicates++;continue}throw err}
  }
  return {evaluatedAt:now.toISOString(),evaluatedBy:actor,recordsScanned:incidents.length,scanTruncated:incidents.length===1000,proposedCount:proposed.length,newLogEntries:created.length,duplicatesSuppressed:duplicates,delivery:{channel:deliveryConfigured?'webhook':'internal_log',queued:created.filter((e:any)=>e.deliveryStatus==='queued').length,actualNotificationsSent:false},entries:created,note:deliveryConfigured?'New events are queued for the configured webhook; run the delivery worker or wait for the scheduler.':'This run records deduplicated internal events only. Configure RECOVERY_NOTIFICATION_WEBHOOK_URL to enable external delivery.'};
 }
 async getRecoveryAlerts(daysAhead=7){
  const boundedDays=Math.max(1,Math.min(30,Number.isFinite(Number(daysAhead))?Math.floor(Number(daysAhead)):7));
  const now=new Date();const cutoff=new Date(now.getTime()+boundedDays*24*60*60*1000);
  const incidents:any[]=await this.incidents.find({status:{$ne:'closed'}}).sort({dueDate:1,updatedAt:1}).limit(1000).lean();
  const overdue:any[]=[];const dueSoon:any[]=[];const criticalOpen:any[]=[];const awaitingApproval:any[]=[];const unassigned:any[]=[];
  for(const r of incidents){
   const due=r.dueDate?new Date(r.dueDate):null;
   const item={_id:String(r._id),incidentCode:r.incidentCode,title:r.title,severity:r.severity,status:r.status,assignedTo:r.assignedTo||'',dueDate:r.dueDate||null,caseId:r.caseId||'',evidenceId:r.evidenceId||'',createdAt:r.createdAt||null,recordVersion:r.recordVersion};
   if(due&&!Number.isNaN(due.getTime())&&due<now)overdue.push({...item,daysOverdue:Math.floor((now.getTime()-due.getTime())/(24*60*60*1000))});
   else if(due&&due>=now&&due<=cutoff)dueSoon.push({...item,daysUntilDue:Math.ceil((due.getTime()-now.getTime())/(24*60*60*1000))});
   if(['critical','high'].includes(r.severity))criticalOpen.push(item);
   if(r.status==='awaiting_approval')awaitingApproval.push(item);
   if(!r.assignedTo?.trim())unassigned.push(item);
  }
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const priority = (a: any, b: any) =>
  (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4);
  for(const list of [overdue,dueSoon,criticalOpen,awaitingApproval,unassigned])list.sort(priority);
  return {generatedAt:now.toISOString(),dueSoonWindowDays:boundedDays,recordsScanned:incidents.length,scanTruncated:incidents.length===1000,counts:{open:incidents.length,overdue:overdue.length,dueSoon:dueSoon.length,criticalOrHigh:criticalOpen.length,awaitingApproval:awaitingApproval.length,unassigned:unassigned.length},overdue,dueSoon,criticalOpen,awaitingApproval,unassigned,delivery:{mode:'on_demand_dashboard',emailSent:false,smsSent:false},note:'Alerts are computed when this endpoint is requested. No background scheduler or email/SMS delivery is configured.'};
 }
 async listRecoveryIncidents(status?:string){
  const allowed=['open','assigned','in_progress','awaiting_recovery','awaiting_approval','closed'];
  if(status&&!allowed.includes(status))throw new BadRequestException('Invalid incident status');
  return this.incidents.find(status?{status}:{}).sort({severity:1,dueDate:1,updatedAt:-1}).limit(500).lean();
 }
 async createRecoveryIncident(dto:any,actor:string){
  if(!dto?.incidentCode?.trim()||!dto?.title?.trim()||!dto?.description?.trim())throw new BadRequestException('Incident code, title and description are required');
  const severity=['critical','high','medium','low'].includes(dto.severity)?dto.severity:'medium';
  if(dto.caseId&&!await this.cases.findById(dto.caseId).lean())throw new NotFoundException('Linked investigation case not found');
  if(dto.evidenceId&&!await this.evidence.findById(dto.evidenceId).lean())throw new NotFoundException('Linked evidence record not found');
  const history=[{at:new Date(),actor,action:'created',reason:'Recovery incident created',fromStatus:'',toStatus:'open',version:1}];
  return (await this.incidents.create({incidentCode:dto.incidentCode.trim(),title:dto.title.trim(),description:dto.description.trim(),severity,status:'open',caseId:dto.caseId||undefined,evidenceId:dto.evidenceId||undefined,createdBy:actor,assignedTo:dto.assignedTo?.trim()||undefined,dueDate:dto.dueDate?new Date(dto.dueDate):undefined,recordVersion:1,history})).toObject();
 }
 async updateRecoveryIncident(id:string,dto:any,actor:string){
  const r:any=await this.incidents.findById(id);if(!r)throw new NotFoundException('Recovery incident not found');
  if(dto.expectedVersion!==undefined&&Number(dto.expectedVersion)!==r.recordVersion)throw new ConflictException('Incident changed. Refresh and retry.');
  if(r.status==='closed')throw new ConflictException('Closed incidents cannot be changed; create a follow-up incident if needed.');
  const previous=r.status;const changes:string[]=[];
  if(dto.assignedTo!==undefined&&dto.assignedTo!==r.assignedTo){r.assignedTo=String(dto.assignedTo).trim()||undefined;changes.push('assignment updated')}
  if(dto.dueDate!==undefined){r.dueDate=dto.dueDate?new Date(dto.dueDate):undefined;changes.push('deadline updated')}
  if(dto.resolutionSummary!==undefined&&String(dto.resolutionSummary).trim()){r.resolutionSummary=String(dto.resolutionSummary).trim();changes.push('resolution summary updated')}
  if(dto.status!==undefined){
   const allowed=['open','assigned','in_progress','awaiting_recovery','awaiting_approval','closed'];
   if(!allowed.includes(dto.status))throw new BadRequestException('Invalid incident status');
   if(dto.status==='closed')throw new BadRequestException('Use the close action with a documented reason and required independent approval.');
   if(dto.status!==r.status){r.status=dto.status;changes.push('status changed')}
  }
  if(!changes.length)throw new BadRequestException('No changes supplied');
  r.recordVersion+=1;r.history.push({at:new Date(),actor,action:'updated',reason:String(dto.reason||changes.join('; ')).trim(),fromStatus:previous,toStatus:r.status,version:r.recordVersion});
  await r.save();return r.toObject();
 }
 async approveRecoveryIncident(id:string,actor:string,reason:string){
  if(!reason?.trim())throw new BadRequestException('Approval reason is required');
  const r:any=await this.incidents.findById(id);if(!r)throw new NotFoundException('Recovery incident not found');
  if(r.status!=='awaiting_approval')throw new BadRequestException('Incident must be awaiting approval');
  if(r.createdBy===actor||r.assignedTo===actor)throw new BadRequestException('Creator or assigned owner cannot independently approve closure');
  r.approvedBy=actor;r.approvedAt=new Date();r.recordVersion+=1;
  r.history.push({at:new Date(),actor,action:'closure_approved',reason:reason.trim(),fromStatus:r.status,toStatus:r.status,version:r.recordVersion});
  await r.save();return r.toObject();
 }
 async closeRecoveryIncident(id:string,actor:string,reason:string,resolutionSummary:string){
  if(!reason?.trim()||!resolutionSummary?.trim())throw new BadRequestException('Closure reason and resolution summary are required');
  const r:any=await this.incidents.findById(id);if(!r)throw new NotFoundException('Recovery incident not found');
  if(r.status==='closed')throw new ConflictException('Incident is already closed');
  if(['critical','high'].includes(r.severity)&&(!r.approvedBy||r.approvedBy===actor||r.approvedBy===r.createdBy))throw new BadRequestException('Critical/high incidents require an independent closure approval before closure');
  const previous=r.status;r.status='closed';r.closeReason=reason.trim();r.resolutionSummary=resolutionSummary.trim();r.closedBy=actor;r.closedAt=new Date();r.recordVersion+=1;
  r.history.push({at:new Date(),actor,action:'closed',reason:reason.trim(),fromStatus:previous,toStatus:'closed',version:r.recordVersion});
  await r.save();return r.toObject();
 }
 async storageHealth(){
  const dir=this.storageDir();
  try{
   await mkdir(dir,{recursive:true,mode:0o700});
   const entries=await readdir(dir,{withFileTypes:true});
   const files=entries.filter(e=>e.isFile()).length;
   const dirs=entries.filter(e=>e.isDirectory()).length;
   return {storageConfigured:true,storageDirectoryConfigured:true,fileCount:files,subdirectoryCount:dirs,storageDirectory:dir,checkedAt:new Date().toISOString(),note:'Path is reported for owner operations only. This is not a disk-capacity or backup-health check.'};
  }catch(err:any){return {storageConfigured:false,storageDirectoryConfigured:false,error:String(err?.code||err?.message||'storage unavailable'),checkedAt:new Date().toISOString()}}
 }
 async reconcileStorage(apply:boolean,actor:string){
  const dir=this.storageDir();
  await mkdir(dir,{recursive:true,mode:0o700});
  const records=await this.evidence.find({}).select('_id evidenceCode storedFileName sha256 sizeBytes status').limit(5001).lean();
  const truncated=records.length>5000;
  const bounded=records.slice(0,5000);
  const diskEntries=await readdir(dir,{withFileTypes:true});
  const diskFiles=new Set(diskEntries.filter(e=>e.isFile()).map(e=>e.name));
  const referenced=new Set(bounded.map((r:any)=>basename(String(r.storedFileName||''))));
  const missing:any[]=[];
  const corrupt:any[]=[];
  for(const rec of bounded as any[]){
   const key=basename(String(rec.storedFileName||''));
   if(!key||!diskFiles.has(key)){missing.push({evidenceId:String(rec._id),evidenceCode:rec.evidenceCode,storedFileName:key,status:rec.status});continue}
   if(rec.status==='active'){
    try{
     const p=join(dir,key);const [bytes,meta]=await Promise.all([readFile(p),stat(p)]);
     const hash=createHash('sha256').update(bytes).digest('hex');
     if(hash!==rec.sha256||bytes.length!==rec.sizeBytes||meta.size!==rec.sizeBytes){
      corrupt.push({evidenceId:String(rec._id),evidenceCode:rec.evidenceCode,expectedSha256:rec.sha256,actualSha256:hash,expectedSize:rec.sizeBytes,actualSize:bytes.length,status:rec.status});
     }
    }catch{missing.push({evidenceId:String(rec._id),evidenceCode:rec.evidenceCode,storedFileName:key,status:rec.status})}
   }
  }
  const orphanFiles=[...diskFiles].filter(name=>!referenced.has(name)).map(name=>({storedFileName:name}));
  const actions:any[]=[];
  if(apply){
   for(const item of corrupt){
    const rec:any=await this.evidence.findById(item.evidenceId);
    if(rec&&rec.status==='active'){
     rec.status='quarantined';await rec.save();
     await this.events.create({evidenceId:String(rec._id),evidenceCode:rec.evidenceCode,eventType:'quarantined',actor,reason:'Storage reconciliation detected hash or size mismatch; file withheld',sha256:item.actualSha256});
     actions.push({type:'quarantine_corrupt_record',evidenceId:item.evidenceId});
    }
   }
   for(const item of missing){
    const rec:any=await this.evidence.findById(item.evidenceId);
    if(rec&&rec.status==='active'){
     rec.status='quarantined';await rec.save();
     await this.events.create({evidenceId:String(rec._id),evidenceCode:rec.evidenceCode,eventType:'quarantined',actor,reason:'Storage reconciliation found missing file; evidence record quarantined pending recovery',sha256:rec.sha256});
     actions.push({type:'quarantine_missing_record',evidenceId:item.evidenceId});
    }
   }
  }
  return {mode:apply?'apply':'dry_run',checkedAt:new Date().toISOString(),recordsScanned:bounded.length,scanTruncated:truncated,missingCount:missing.length,corruptCount:corrupt.length,orphanFileCount:orphanFiles.length,missing,corrupt,orphanFiles,actions,note:'Orphan files are reported but never automatically deleted. Missing/corrupt records are only marked quarantined when apply=true. Reconciliation is bounded and not a transactional snapshot.'};
 }
 async list(caseId:string){
  if(!caseId?.trim())throw new BadRequestException('caseId is required');
  if(!await this.cases.findById(caseId).lean())throw new NotFoundException('Investigation case not found');
  return this.evidence.find({caseId,status:{$ne:'quarantined'}}).sort({createdAt:-1}).limit(200).lean();
 }
 async history(id:string){
  const evidence=await this.evidence.findById(id).lean();if(!evidence)throw new NotFoundException('Evidence not found');
  const events=await this.events.find({evidenceId:id}).sort({createdAt:1}).limit(500).lean();return {evidence,events};
 }
 async review(id:string,actor:string,reason:string,description?:string){
  if(!reason?.trim())throw new BadRequestException('Review reason required');
  const r=await this.evidence.findById(id);if(!r)throw new NotFoundException('Evidence not found');
  if(r.status!=='active')throw new BadRequestException('Only active evidence can be reviewed');
  if(description?.trim())r.description=description.trim();await r.save();
  await this.events.create({evidenceId:String(r._id),evidenceCode:r.evidenceCode,eventType:'reviewed',actor,reason:reason.trim(),sha256:r.sha256});return r.toObject();
 }
 async quarantine(id:string,actor:string,reason:string){
  if(!reason?.trim())throw new BadRequestException('Quarantine reason required');
  const r=await this.evidence.findById(id);if(!r)throw new NotFoundException('Evidence not found');
  if(r.status==='quarantined')throw new BadRequestException('Already quarantined');
  r.status='quarantined';await r.save();
  await this.events.create({evidenceId:String(r._id),evidenceCode:r.evidenceCode,eventType:'quarantined',actor,reason:reason.trim(),sha256:r.sha256});return r.toObject();
 }
}
