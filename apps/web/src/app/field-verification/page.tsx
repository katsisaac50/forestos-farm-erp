'use client';
import React,{useEffect,useState} from 'react';
import {getData,postData,patchData} from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type Row={_id?:string;runId:string;workerIdentifier:string;farmBlock:string;activityType:string;latitude:number;longitude:number;accuracyMeters:number;evidenceReference:string;reviewStatus:string;reviewNote?:string;createdAt?:string};

export default function FieldVerificationPage(){
 const [rows,setRows]=useState<Row[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[gps,setGps]=useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
 const [runId,setRunId]=useState(''),[worker,setWorker]=useState(''),[block,setBlock]=useState(''),[activity,setActivity]=useState('eucalyptus_inspection'),[evidence,setEvidence]=useState(''),[note,setNote]=useState(''),[reviews,setReviews]=useState<Record<string,string>>({});
 async function refresh(){try{const d:any=await getData<any>('/field-verification');setRows(Array.isArray(d)?d:(d?.records||[]))}catch(e:any){setMessage(e?.message||'Could not load records.')}}
 useEffect(()=>{refresh()},[]);
 function capture(){if(!navigator.geolocation){setMessage('Geolocation is unavailable in this browser.');return}setBusy(true);navigator.geolocation.getCurrentPosition(p=>{setGps({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});setBusy(false);setMessage('GPS captured. Confirm the farm block; GPS is not proof of work.')},e=>{setBusy(false);setMessage('GPS unavailable: '+e.message)},{enableHighAccuracy:true,timeout:15000,maximumAge:0})}
 async function submit(e:React.FormEvent){e.preventDefault();if(!gps){setMessage('Capture GPS first.');return}setBusy(true);try{await postData('/field-verification',{runId,workerIdentifier:worker,farmBlock:block,activityType:activity,latitude:gps.latitude,longitude:gps.longitude,accuracyMeters:gps.accuracy,evidenceReference:evidence,workerNote:note});setMessage('Submitted for owner review.');setRunId('');setBlock('');setEvidence('');setNote('');await refresh()}catch(e:any){setMessage(e?.message||'Submission failed.')}finally{setBusy(false)}}
 async function review(r:Row,approve:boolean){if(!r._id)return;const reviewNote=(reviews[r._id]||'').trim();if(!reviewNote){setMessage('A review note is required.');return}setBusy(true);try{await patchData('/field-verification/'+encodeURIComponent(r._id)+(approve?'/approve':'/reject'),{reviewNote});setMessage(approve?'Approved.':'Rejected.');await refresh()}catch(e:any){setMessage(e?.message||'Review failed; check owner role.')}finally{setBusy(false)}}

 return (
  <div className="shell">
   <NavSidebar />
   <main id="main-content" className="main">
    <div className="mx-auto max-w-4xl">
     <header className="mb-5 rounded-2xl border p-4">
      <p className="text-sm font-semibold uppercase">ForestOS · Phase 31</p>
      <h1 className="mt-1 text-2xl font-bold">GPS field verification</h1>
      <p className="mt-2 text-sm">Record GPS metadata and a reference to existing photo/evidence. This page does not upload image files.</p>
     </header>

     <form onSubmit={submit} className="mb-6 space-y-3 rounded-2xl border p-4">
      <h2 className="text-lg font-bold">Submit inspection record</h2>
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="text-sm">SOP run ID<input required value={runId} onChange={e=>setRunId(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
       <label className="text-sm">Worker login identifier<input required value={worker} onChange={e=>setWorker(e.target.value)} placeholder="Email or login subject" className="mt-1 w-full rounded border p-2"/></label>
       <label className="text-sm">Farm block<input required value={block} onChange={e=>setBlock(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
       <label className="text-sm">Activity
        <select value={activity} onChange={e=>setActivity(e.target.value)} className="mt-1 w-full rounded border p-2">
         <option value="eucalyptus_inspection">Eucalyptus inspection</option>
         <option value="planting_or_replanting">Planting / replanting</option>
         <option value="beekeeping_inspection">Beekeeping inspection</option>
         <option value="maintenance">Maintenance</option>
         <option value="harvest_work">Harvest work</option>
         <option value="other">Other</option>
        </select>
       </label>
       <label className="text-sm sm:col-span-2">Evidence reference<input required maxLength={240} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Existing evidence ID or photo reference" className="mt-1 w-full rounded border p-2"/></label>
       <label className="text-sm sm:col-span-2">Worker note<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
       <p>{gps?`GPS ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} · reported accuracy ±${Math.round(gps.accuracy)}m`:'GPS not captured'}</p>
       <button type="button" onClick={capture} disabled={busy} className="mt-2 rounded-lg border px-4 py-2">Capture current GPS</button>
       <p className="mt-2 text-xs">Geolocation generally requires HTTPS or localhost and browser permission.</p>
      </div>
      <button disabled={busy} className="rounded-lg bg-black px-4 py-2 text-white">{busy?'Working…':'Submit for review'}</button>
     </form>

     <section className="rounded-2xl border p-4">
      <div className="flex justify-between">
       <h2 className="text-lg font-bold">Review register</h2>
       <button onClick={refresh} className="rounded border px-3 py-2">Refresh</button>
      </div>
      {message&&<p role="status" className="my-3 rounded bg-amber-50 p-3 text-sm">{message}</p>}
      {rows.length===0?
       <p className="mt-3 text-sm">No records visible.</p>:
       <div className="mt-3 space-y-3">
        {rows.map((r,i)=>
         <article key={r._id||i} className="rounded-xl border p-3">
          <div className="flex flex-wrap justify-between gap-2">
           <div>
            <h3 className="font-bold">{r.farmBlock} · {r.activityType}</h3>
            <p className="text-sm">Run {r.runId} · {r.workerIdentifier}</p>
            <p className="text-sm">GPS {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)} · ±{r.accuracyMeters}m</p>
            <p className="text-sm">Evidence: {r.evidenceReference}</p>
           </div>
           <span className="rounded-full border px-3 py-1 text-xs">{r.reviewStatus}</span>
          </div>
          {r.reviewNote&&<p className="mt-2 text-sm">Review note: {r.reviewNote}</p>}
          {r.reviewStatus==='submitted'&&
           <div className="mt-3 space-y-2">
            <input value={reviews[r._id||'']||''} onChange={e=>setReviews(old=>({...old,[r._id||'']:e.target.value}))} placeholder="Required supervisor review note" className="w-full rounded border p-2 text-sm"/>
            <div className="flex gap-2">
             <button onClick={()=>review(r,true)} disabled={busy} className="rounded border px-3 py-2">Approve</button>
             <button onClick={()=>review(r,false)} disabled={busy} className="rounded border px-3 py-2">Reject</button>
            </div>
           </div>
          }
         </article>
        )}
       </div>
      }
     </section>

     <p className="mt-5 text-xs opacity-70">GPS is device-reported and can be inaccurate or spoofed. Evidence references are not validated against the evidence store in this phase.</p>
    </div>
   </main>
  </div>
 );
}