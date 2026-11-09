#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const STATUSES=new Set(['submitted','approved','returned','rejected','rework_submitted','cancelled']);
const TYPES=new Set(['photo','document','measurement','other']), RESULTS=new Set(['pass','fail','not_applicable','pending']), DECISIONS=new Set(['approve','return','reject']), RW=new Set(['open','in_progress','submitted','verified','cancelled']);
function dateOk(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
function str(s){return typeof s==='string'&&s.trim().length>0}
function num(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0}
function arr(x){return Array.isArray(x)?x:[]}
function analyze(input,now){
 const errors=[],warnings=[],attention=[],records=arr(input&&input.records),ids=new Set(),evIds=new Set(),byStatus={};
 if(!input||!Array.isArray(input.records))errors.push({code:'records_required',message:'Input must contain a records array.'});
 if(!dateOk(now))errors.push({code:'invalid_now',message:'--now must be a real YYYY-MM-DD date.'});
 let evidenceCount=0,missingEvidence=0,failedChecklist=0,quantityShortfalls=0,openRework=0,overdueRework=0,overdueReview=0;
 for(const r of records){
  if(!r||typeof r!=='object'||Array.isArray(r)){errors.push({code:'invalid_record',message:'Each record must be an object.'});continue}
  const err=(code,message,extra={})=>errors.push({code,id:r.id,...extra,message});
  if(!str(r.id))err('record_id_required','Record id is required.');else if(ids.has(r.id))err('duplicate_record_id',`Duplicate record id: ${r.id}`);else ids.add(r.id);
  if(!str(r.taskId))err('task_id_required','taskId is required.');
  if(!str(r.worker))err('worker_required','worker is required.');
  if(!dateOk(r.submittedDate))err('invalid_submitted_date','submittedDate must be a real YYYY-MM-DD date.');
  if(!STATUSES.has(r.status))err('invalid_status',`Invalid status: ${r.status}`);
  if(r.area!==undefined&&!str(r.area))err('invalid_area','area must be non-empty when supplied.');
  for(const k of ['plannedQuantity','reportedQuantity'])if(r[k]!==undefined&&!num(r[k]))err('invalid_'+(k==='plannedQuantity'?'planned':'reported')+'_quantity',k+' must be non-negative.');
  if((r.plannedQuantity!==undefined||r.reportedQuantity!==undefined)&&!str(r.unit))err('unit_required','unit is required when quantities are provided.');
  if(dateOk(r.submittedDate)&&dateOk(now)&&r.submittedDate>now&&r.status!=='cancelled')warnings.push({code:'future_submission_date',id:r.id,message:'Submission date is in the future.'});
  if(r.evidence!==undefined&&!Array.isArray(r.evidence))err('invalid_evidence_list','evidence must be an array.');
  const evidence=arr(r.evidence); evidenceCount+=evidence.length;
  for(const e of evidence){
   if(!e||typeof e!=='object'||!str(e.id)||!TYPES.has(e.type)||!str(e.reference)||!dateOk(e.capturedDate)){err('invalid_evidence','Evidence needs id, supported type, reference, and valid capturedDate.',{evidenceId:e&&e.id});continue}
   if(evIds.has(e.id))err('duplicate_evidence_id',`Evidence id must be globally unique: ${e.id}`,{evidenceId:e.id});else evIds.add(e.id);
   if(dateOk(r.submittedDate)&&e.capturedDate>r.submittedDate)warnings.push({code:'evidence_after_submission',id:r.id,evidenceId:e.id,message:'Evidence captured after submission date.'});
  }
  const evRequired=r.evidenceRequired!==false;
  if(evRequired&&!evidence.length&&r.status!=='cancelled'){missingEvidence++;if(r.status==='approved')err('approved_without_evidence','Approved work requires evidence unless evidenceRequired is false.');else attention.push({id:r.id,code:'missing_evidence',message:'Required evidence is missing.'})}
  if(r.checklist!==undefined&&!Array.isArray(r.checklist))err('invalid_checklist','checklist must be an array.');
  const checklist=arr(r.checklist);
  for(const c of checklist){
   if(!c||typeof c!=='object'||!str(c.criterion)||!RESULTS.has(c.result)){err('invalid_checklist_item','Checklist items need criterion and valid result.');continue}
   if(c.result==='fail'){failedChecklist++;attention.push({id:r.id,code:'checklist_failure',criterion:c.criterion,message:`Failed criterion: ${c.criterion}`})}
   if(c.required!==false&&c.result!=='pass'&&r.status==='approved')err('approval_with_unmet_criterion','Approved work has a required criterion that is not passed.',{criterion:c.criterion});
  }
  if(r.plannedQuantity!==undefined&&r.reportedQuantity!==undefined&&num(r.plannedQuantity)&&num(r.reportedQuantity)&&r.reportedQuantity<r.plannedQuantity){
   quantityShortfalls++;const accepted=r.review&&r.review.decision==='approve'&&r.review.quantityAccepted===true;
   if(r.status==='approved'&&!accepted)err('unaccepted_quantity_shortfall','Approved quantity shortfall requires review.quantityAccepted=true.');
   else attention.push({id:r.id,code:'quantity_shortfall',message:`Reported ${r.reportedQuantity} ${r.unit}; planned ${r.plannedQuantity} ${r.unit}.`});
  }
  if(r.review!==undefined&&r.review!==null){
   const v=r.review;
   if(!v||typeof v!=='object'||!str(v.reviewer)||!dateOk(v.date)||!DECISIONS.has(v.decision))err('invalid_review','Review requires reviewer, valid date, and approve/return/reject decision.');
   else{
    if(dateOk(r.submittedDate)&&v.date<r.submittedDate)err('review_before_submission','Review date cannot precede submission.');
    if(dateOk(now)&&v.date>now)warnings.push({code:'future_review_date',id:r.id,message:'Review date is in the future.'});
    if(v.decision==='approve'&&r.status!=='approved'||v.decision==='return'&&r.status!=='returned'||v.decision==='reject'&&r.status!=='rejected')err('review_status_mismatch','Review decision and status do not match.');
    if(['return','reject'].includes(v.decision)&&!str(v.notes))err('review_notes_required','Return/reject decisions require explanatory notes.');
   }
  }else if(['approved','returned','rejected'].includes(r.status))err('review_required',`${r.status} status requires a supervisor review.`);
  if(r.status==='approved'){
   if(!checklist.every(c=>c&&(c.required===false||c.result==='pass')))err('approval_checklist_incomplete','All required checklist criteria must pass before approval.');
   if(!r.review||r.review.decision!=='approve')err('approval_decision_missing','Approved status requires an approve review.');
  }
  if(['returned','rejected'].includes(r.status)&&(!r.rework||!str(r.rework.reason)||!str(r.rework.assignedTo)||!dateOk(r.rework.dueDate)||!RW.has(r.rework.status)))err('rework_required','Returned/rejected work requires rework reason, assignedTo, dueDate, and valid status.');
  if(r.rework!==undefined&&r.rework!==null){
   const rw=r.rework;
   if(!rw||typeof rw!=='object'||!RW.has(rw.status)||!dateOk(rw.dueDate))err('invalid_rework','Rework requires valid status and dueDate.');
   else{
    if(!['verified','cancelled'].includes(rw.status))openRework++;
    if(!['verified','cancelled'].includes(rw.status)&&dateOk(now)&&rw.dueDate<now){overdueRework++;attention.push({id:r.id,code:'overdue_rework',message:`Rework due ${rw.dueDate}.`})}
    if(r.status==='rework_submitted'&&rw.status!=='submitted')err('rework_status_mismatch','rework_submitted record requires rework.status=submitted.');
   }
  }
  if(r.status==='submitted'&&dateOk(r.submittedDate)&&dateOk(now)&&r.submittedDate<now&&!r.review){overdueReview++;attention.push({id:r.id,code:'overdue_review',message:'Submitted work is awaiting supervisor review.'})}
  if(r.status==='rework_submitted'&&!evidence.length&&evRequired)attention.push({id:r.id,code:'rework_evidence_missing',message:'Resubmitted rework should include fresh evidence.'});
  byStatus[r.status]=(byStatus[r.status]||0)+1;
 }
 const total=records.length,approved=records.filter(r=>r&&r.status==='approved').length,reviewed=records.filter(r=>r&&r.review&&DECISIONS.has(r.review.decision)).length;
 return {phase:143,generatedAt:now,summary:{totalRecords:total,byStatus,submitted:records.filter(r=>r&&r.status==='submitted').length,approved,returned:records.filter(r=>r&&r.status==='returned').length,rejected:records.filter(r=>r&&r.status==='rejected').length,reviewedRecords:reviewed,reviewRate:total?+((reviewed/total).toFixed(4)):0,approvalRate:reviewed?+((approved/reviewed).toFixed(4)):0,evidenceCount,recordsMissingEvidence:missingEvidence,failedChecklistItems:failedChecklist,quantityShortfalls,openRework,overdueRework,overdueReview,errorCount:errors.length,warningCount:warnings.length,attentionCount:attention.length},errors,warnings,attention};
}
function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return i<0?[a.replace(/^--/,''),true]:[a.slice(2,i),a.slice(i+1)]}));if(!args.input){console.error('Usage: node phase143-supervisor-verification-evidence.js --input=records.json [--output=report.json] [--now=YYYY-MM-DD]');process.exit(2)}try{const input=JSON.parse(fs.readFileSync(path.resolve(args.input),'utf8')),report=analyze(input,args.now||new Date().toISOString().slice(0,10)),out=JSON.stringify(report,null,2);if(args.output)fs.writeFileSync(path.resolve(args.output),out+'\n');else console.log(out);if(report.summary.errorCount)process.exitCode=1}catch(e){console.error('Phase 143 failed: '+e.message);process.exit(2)}}
if(require.main===module)main();module.exports={analyze,dateOk};
