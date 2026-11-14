'use client';
import React,{useEffect,useState} from 'react';
import {getData,patchData} from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type Result={code?:string;label?:string;result?:string;note?:string;evidenceReference?:string;[k:string]:any};
type Run={_id?:string;id?:string;title?:string;siteOrBlock?:string;scheduledDate?:string;status?:string;checklistResults?:Result[];[k:string]:any};
type Draft={id:string;runId:string;payload:any;queuedAt:string;error?:string};
const KEY='forestos.field-work.queue.v1';
const idOf=(r:Run)=>String(r._id||r.id||'');

export default function FieldWorkPage(){
 const [runs,setRuns]=useState<Run[]>([]),[queue,setQueue]=useState<Draft[]>([]),[online,setOnline]=useState(true),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const read=():Draft[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
 const save=(q:Draft[])=>{setQueue(q);try{localStorage.setItem(KEY,JSON.stringify(q))}catch{setMessage('Browser storage is full. Sync drafts before adding more.')}};
 async function refresh(){setLoading(true);try{const d:any=await getData<any>('/sops/my-runs');setRuns(Array.isArray(d)?d:(d?.runs||[]));setMessage('')}catch(e:any){setMessage(e?.message||'Could not load assigned work. Check sign-in and assignment identifier.')}finally{setLoading(false)}}
 useEffect(()=>{setOnline(navigator.onLine);setQueue(read());refresh();const a=()=>setOnline(true),b=()=>setOnline(false);window.addEventListener('online',a);window.addEventListener('offline',b);return()=>{window.removeEventListener('online',a);window.removeEventListener('offline',b)}},[]);
 useEffect(()=>{if(online&&queue.length>0&&!busy){const timer=window.setTimeout(()=>{void sync()},1200);return()=>window.clearTimeout(timer)}},[online,queue.length]);
 function change(run:Run,index:number,value:string){const rid=idOf(run);if(!rid)return;const results=(run.checklistResults||[]).map((x,i)=>i===index?{...x,result:value}:x);const payload={checklistResults:results};const d:Draft={id:rid+':'+Date.now()+':'+Math.random().toString(36).slice(2,7),runId:rid,payload,queuedAt:new Date().toISOString()};save([...queue,d]);setRuns(old=>old.map(r=>idOf(r)===rid?{...r,checklistResults:results}:r));setMessage(online?'Draft saved on this device. Sync drafts when ready.':'Offline: draft queued on this device. It will attempt to sync when connectivity returns.')}
 async function sync(){if(!online){setMessage('Offline. Drafts remain queued.');return}setBusy(true);let left=[...queue],sent=0;for(const d of queue){try{await patchData('/sops/runs/'+encodeURIComponent(d.runId),d.payload);left=left.filter(x=>x.id!==d.id);sent++;save(left)}catch(e:any){left=left.map(x=>x.id===d.id?{...x,error:e?.message||'Sync failed; review before retrying.'}:x);save(left)}}setBusy(false);setMessage(sent+' update(s) synced; '+left.length+' draft(s) remain queued. Review failed updates before retrying.');await refresh()}

 return (
  <div className="shell">
   <NavSidebar />
   <main id="main-content" className="main">
    <div className="mx-auto max-w-3xl">
     <header className="mb-5 rounded-2xl border p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide">ForestOS · Field Work</p>
      <h1 className="mt-1 text-2xl font-bold">My assigned checklists</h1>
      <p className="mt-2 text-sm">Mobile-first field checklist drafts with queued retries and automatic sync attempts when connectivity returns.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
       <span className="rounded-full border px-3 py-1">{online?'Online':'Offline'}</span>
       <span className="rounded-full border px-3 py-1">{runs.length} assigned run(s)</span>
       <span className="rounded-full border px-3 py-1">{queue.length} queued draft(s)</span>
      </div>
      <div className="mt-4 flex gap-2">
       <button className="rounded-lg border px-4 py-2" onClick={refresh} disabled={loading}>Refresh</button>
       <button className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" onClick={sync} disabled={busy||!queue.length||!online}>{busy?'Syncing…':'Sync drafts now'}</button>
      </div>
      {message&&<p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}
     </header>

     <section className="mb-5 rounded-xl border p-4">
      <h2 className="font-bold">Offline safety</h2>
      <p className="mt-1 text-sm">Drafts are stored in browser local storage and are not encrypted. Avoid shared devices and sync before clearing browser data. A local draft is not server-confirmed completion.</p>
     </section>

     {loading?<p>Loading…</p>:
      runs.length===0?
       <section className="rounded-xl border p-5">
        <h2 className="font-bold">No assigned runs found</h2>
        <p className="mt-2 text-sm">The run's assigned-to value must match the login email, username or JWT subject identifier. Ask the owner to check the assignment.</p>
       </section>:
       <div className="space-y-4">
        {runs.map((r,ri)=>
         <article key={idOf(r)||ri} className="rounded-2xl border p-4 shadow-sm">
          <h2 className="text-lg font-bold">{r.title||'SOP checklist'}</h2>
          <p className="text-sm opacity-75">{r.siteOrBlock||'Farm block'} · {r.scheduledDate||'No date'} · {r.status||'open'}</p>
          <div className="mt-4 space-y-3">
           {(r.checklistResults||[]).map((x,i)=>
            <div key={x.code||i} className="rounded-xl border p-3">
             <p className="text-sm font-medium">{x.label||x.code||'Checklist item '+(i+1)}</p>
             <select className="mt-2 w-full rounded-lg border p-2" value={x.result||'not_done'} onChange={e=>change(r,i,e.target.value)}>
              <option value="not_done">Not done</option>
              <option value="done">Done</option>
              <option value="not_applicable">Not applicable</option>
             </select>
             {x.note&&<p className="mt-1 text-xs opacity-70">{x.note}</p>}
            </div>
           )}
          </div>
          <p className="mt-3 text-xs opacity-70">Draft changes only. Submission and owner verification remain in the SOP workflow.</p>
         </article>
        )}
       </div>
     }

     <div className="mt-6 border-t pt-4 text-xs opacity-70">
      Automatic sync is foreground-only while this page is open; browser background sync, encrypted local storage, file upload and automatic conflict resolution are not implemented. Failed updates remain queued for review.
     </div>
    </div>
   </main>
  </div>
 );
}