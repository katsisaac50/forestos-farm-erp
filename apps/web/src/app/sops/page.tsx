"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getData,postData,patchData} from '../../lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type Template={_id:string;sopCode:string;title:string;workstream:string;cadence:string;purpose:string;checklist:any[];status:string;safetyNotes:string};
type Run={_id:string;sopCode:string;title:string;workstream:string;siteOrBlock:string;scheduledDate:string;assignedTo:string;status:string;checklistResults:any[];completionSummary?:string;exceptionNotes?:string;verificationNote?:string;evidenceReference?:string;createdAt:string;updatedAt:string};

export default function SOPPage(){
 const [templates,setTemplates]=useState<Template[]>([]);const [runs,setRuns]=useState<Run[]>([]);const [overview,setOverview]=useState<any>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const [templateId,setTemplateId]=useState('');const [site,setSite]=useState('');const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [assigned,setAssigned]=useState('');const [selected,setSelected]=useState('');const [draft,setDraft]=useState<any>({});
 async function load(){try{const [t,r,o]=await Promise.all([getData<Template[]>('/sops/templates'),getData<Run[]>('/sops/runs'),getData<any>('/sops/overview')]);setTemplates(t);setRuns(r);setOverview(o);if(!templateId&&t.length)setTemplateId(t.find(x=>x.status==='active')?._id||'');}catch(e:any){setMessage(e.message||'Could not load SOP workspace.')}}
 useEffect(()=>{load()},[]);
 async function seed(){setBusy(true);setMessage('');try{await postData('/sops/seed-defaults',{});await load();setMessage('Default SOP templates are ready. Review each template before activation or scheduling.')}catch(e:any){setMessage(e.message||'Could not load defaults.')}finally{setBusy(false)}}
 async function createRun(){if(!templateId||!site.trim()||!assigned.trim()){setMessage('Choose an SOP and enter the site/block and assigned person.');return;}setBusy(true);try{await postData('/sops/runs',{templateId,siteOrBlock:site,scheduledDate:date,assignedTo:assigned});await load();setMessage('SOP run scheduled. The assigned person can complete the checklist.')}catch(e:any){setMessage(e.message||'Could not schedule SOP.')}finally{setBusy(false)}}
 const current=runs.find(x=>x._id===selected);
 function setResult(code:string,field:string,value:string){setDraft((d:any)=>({...d,[code]:{...(d[code]||{}),[field]:value}}))}
 async function saveChecklist(){if(!current)return;setBusy(true);try{await patchData(`/sops/runs/${current._id}`,{status:'in_progress',checklistResults:current.checklistResults.map(x=>({...x,...(draft[x.code]||{})}))});await load();setMessage('Checklist saved. Submit the run when required items are complete or explicitly not applicable.')}catch(e:any){setMessage(e.message||'Could not save checklist.')}finally{setBusy(false)}}
 async function updateStatus(run:Run,status:string){setBusy(true);try{const body:any={status};if(status==='submitted'){body.completionSummary=draft.summary||'';body.exceptionNotes=draft.exceptions||'';body.evidenceReference=draft.evidence||'';}if(status==='verified'||status==='rejected')body.verificationNote=draft.verificationNote||'';await patchData(`/sops/runs/${run._id}`,body);await load();setMessage(`Run ${status}.`);if(status==='verified'||status==='rejected')setSelected('');}catch(e:any){setMessage(e.message||'Could not update run.')}finally{setBusy(false)}}
 const fmt=(n:any)=>Number(n||0).toLocaleString();

 return (
  <div className="shell">
   <NavSidebar />
   <main id="main-content" className="main">
    <div className="commandHeader">
     <div>
      <p className="eyebrow">PHASE 29 · STANDARD WORK</p>
      <h1>SOPs, checklists &amp; verification</h1>
      <p className="muted">Use repeatable checklists and record evidence; never treat a tick box as proof of a physical condition by itself.</p>
     </div>
     <button className="btn" onClick={seed} disabled={busy}>Load default SOPs</button>
    </div>
    {message&&<div className="notice">{message}</div>}
    {overview&&<div className="grid commandCards">{[['Active SOPs',overview.totals.activeTemplates],['Open runs',overview.totals.open],['Submitted',overview.totals.submitted],['Verified',overview.totals.verified],['Overdue runs',overview.totals.overdue],['Required checklist done',`${overview.totals.requiredChecklistCompletionPct}%`]].map(([l,v])=><div className="card" key={String(l)}><div className="muted">{l}</div><div className="metric">{fmt(v)}</div></div>)}</div>}
    <section className="panel">
     <h2>Schedule an SOP run</h2>
     <div className="formGrid">
      <label>Active template<select value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="">Choose template…</option>{templates.filter(t=>t.status==='active').map(t=><option key={t._id} value={t._id}>{t.sopCode} · {t.title}</option>)}</select></label>
      <label>Scheduled date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Site / block / apiary<input value={site} onChange={e=>setSite(e.target.value)} placeholder="e.g. Eucalyptus Block A"/></label>
      <label>Assigned person (name or account identifier)<input value={assigned} onChange={e=>setAssigned(e.target.value)} placeholder="Enter responsible person"/></label>
     </div>
     <button className="btn" disabled={busy} onClick={createRun}>Schedule checklist</button>
    </section>
    <section className="panel">
     <h2>SOP templates</h2>
     {templates.length===0?<p>No templates yet. Select "Load default SOPs" to create the starter library.</p>:<div className="tableWrap"><table><thead><tr><th>Code / title</th><th>Workstream</th><th>Cadence</th><th>Status</th><th>Checklist items</th><th>Action</th></tr></thead><tbody>{templates.map(t=><tr key={t._id}><td><b>{t.sopCode}</b><span className="block">{t.title}</span><span className="block">{t.purpose}</span>{t.safetyNotes&&<span className="block">Safety: {t.safetyNotes}</span>}</td><td>{t.workstream}</td><td>{t.cadence}</td><td>{t.status}</td><td>{t.checklist?.length||0}</td><td>{t.status!=='active'&&<button className="btn secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await patchData(`/sops/templates/${t._id}/status`,{status:'active'});await load();setMessage('Template activated. Confirm its checklist and safety guidance are suitable before use.')}catch(e:any){setMessage(e.message||'Could not activate template.')}finally{setBusy(false)}}}>Activate</button>}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel">
     <h2>Scheduled and submitted runs</h2>
     {runs.length===0?<p>No SOP runs have been scheduled.</p>:<div className="tableWrap"><table><thead><tr><th>Schedule</th><th>Workstream / location</th><th>Assigned</th><th>Status</th><th>Checklist</th><th>Action</th></tr></thead><tbody>{runs.map(r=><tr key={r._id}><td><b>{r.sopCode}</b><span className="block">{r.scheduledDate}</span>{r.title}</td><td>{r.workstream}<span className="block">{r.siteOrBlock}</span></td><td>{r.assignedTo}</td><td><span className="pill">{r.status}</span></td><td>{r.checklistResults.filter(x=>x.result==='done').length}/{r.checklistResults.length} done</td><td><button className="btn secondary" onClick={()=>{setSelected(r._id);setDraft({});}}>Open</button></td></tr>)}</tbody></table></div>}
    </section>
    {current&&<section className="panel">
     <div className="commandHeader">
      <div>
       <h2>{current.sopCode} — {current.title}</h2>
       <p className="muted">{current.siteOrBlock} · {current.scheduledDate} · assigned to {current.assignedTo}</p>
      </div>
      <button className="btn secondary" onClick={()=>setSelected('')}>Close</button>
     </div>
     <div className="sopChecklist">
      {current.checklistResults.map((x:any)=><div className="sopItem" key={x.code}>
       <b>{x.label}</b>
       <p className="muted">{templates.find(t=>t.sopCode===current.sopCode)?.checklist.find(c=>c.code===x.code)?.guidance||''}{x.required?' · Required':' · Optional'}</p>
       <div className="formGrid">
        <label>Result<select disabled={['verified','cancelled'].includes(current.status)} value={draft[x.code]?.result??x.result} onChange={e=>setResult(x.code,'result',e.target.value)}><option value="not_done">Not done</option><option value="done">Done</option><option value="not_applicable">Not applicable</option></select></label>
        <label>Evidence reference<input disabled={['verified','cancelled'].includes(current.status)} value={draft[x.code]?.evidenceReference??x.evidenceReference??''} onChange={e=>setResult(x.code,'evidenceReference',e.target.value)} placeholder="Photo/log/reference ID"/></label>
        <label className="span2">Note<textarea disabled={['verified','cancelled'].includes(current.status)} value={draft[x.code]?.note??x.note??''} onChange={e=>setResult(x.code,'note',e.target.value)} placeholder="What was observed or why not done/not applicable?"/></label>
       </div>
      </div>)}
     </div>
     {!['verified','cancelled'].includes(current.status)&&<>
      <label>Completion summary<textarea value={draft.summary||current.completionSummary||''} onChange={e=>setDraft((d:any)=>({...d,summary:e.target.value}))}/></label>
      <label>Exceptions / follow-up needed<textarea value={draft.exceptions||current.exceptionNotes||''} onChange={e=>setDraft((d:any)=>({...d,exceptions:e.target.value}))}/></label>
      <label>Run-level evidence reference<input value={draft.evidence||current.evidenceReference||''} onChange={e=>setDraft((d:any)=>({...d,evidence:e.target.value}))}/></label>
      <div className="row">
       <button className="btn secondary" disabled={busy||['submitted','rejected'].includes(current.status)} onClick={saveChecklist}>Save checklist</button>
       <button className="btn" disabled={busy||['submitted','rejected'].includes(current.status)} onClick={async()=>{await saveChecklist();}}>Save before submitting</button>
       <button className="btn" disabled={busy||['submitted','rejected'].includes(current.status)} onClick={()=>updateStatus(current,'submitted')}>Submit for verification</button>
      </div>
     </>}
     {current.status==='submitted'&&<>
      <label>Owner verification note<textarea value={draft.verificationNote||''} onChange={e=>setDraft((d:any)=>({...d,verificationNote:e.target.value}))}/></label>
      <div className="row">
       <button className="btn" disabled={busy} onClick={()=>updateStatus(current,'verified')}>Verify work</button>
       <button className="btn secondary" disabled={busy} onClick={()=>updateStatus(current,'rejected')}>Reject with note</button>
      </div>
     </>}
    </section>}
   </main>
  </div>
 );
}