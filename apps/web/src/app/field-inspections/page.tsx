'use client';

import { useEffect, useMemo, useState } from 'react';
import { getData, postData } from '../../lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type MapFeature = {
  _id: string; featureType: 'block'|'hive'|'inspection_point'|'access_point'|'other';
  geometryType: 'Point'|'Polygon'; geometry: { type:'Point'|'Polygon'; coordinates:any };
  label: string; blockCode?: string; notes?: string;
};
type Inspection = {
  _id: string; title: string; activityType: string; inspectionType: string; status: string;
  assignedTo: string; locationLabel: string; latitude: number; longitude: number; blockCode?: string;
  checklistSummary?: string; findings?: string; correctiveAction?: string; evidenceReference?: string; reviewNote?: string;
};
function centerOf(f: MapFeature) {
  if (f.geometryType === 'Point') return { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
  const ring: number[][] = f.geometry.coordinates?.[0] || [];
  const pts = ring.slice(0, -1);
  if (!pts.length) return null;
  return { latitude: pts.reduce((s,p)=>s+p[1],0)/pts.length, longitude: pts.reduce((s,p)=>s+p[0],0)/pts.length };
}
function directions(lat:number,lon:number) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`; }

export default function FieldInspectionsPage() {
  const [features,setFeatures] = useState<MapFeature[]>([]);
  const [records,setRecords] = useState<Inspection[]>([]);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [selected,setSelected] = useState('');
  const [title,setTitle] = useState('');
  const [assignedTo,setAssignedTo] = useState('');
  const [activityType,setActivityType] = useState<'eucalyptus'|'beekeeping'|'infrastructure'|'general'>('eucalyptus');
  const [inspectionType,setInspectionType] = useState<'routine'|'follow_up'|'incident'>('routine');
  const [checklistSummary,setChecklistSummary] = useState('');
  const [drafts,setDrafts] = useState<Record<string,{findings:string;correctiveAction:string;evidenceReference:string}>>({});

  async function load() {
    setLoading(true);
    try {
      const [mapData, inspectionData] = await Promise.all([getData<any>('/farm-map'),getData<any>('/field-inspections')]);
      setFeatures(Array.isArray(mapData)?mapData:(mapData?.items||[]));
      setRecords(Array.isArray(inspectionData)?inspectionData:(inspectionData?.items||[]));
      setMessage('');
    } catch(e:any) { setMessage(e?.message||'Could not load inspection data. Sign in and check API.'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load()},[]);
  const feature = useMemo(()=>features.find(f=>f._id===selected),[features,selected]);

  async function createInspection(e:React.FormEvent) {
    e.preventDefault(); setMessage('');
    try {
      if(!feature) throw new Error('Choose a recorded map feature.');
      const pos=centerOf(feature);
      if(!pos) throw new Error('Selected feature has no usable coordinates.');
      await postData('/field-inspections',{
        title:title.trim()||`${activityType} inspection — ${feature.label}`,
        activityType,inspectionType,assignedTo:assignedTo.trim(),
        locationLabel:feature.label,latitude:pos.latitude,longitude:pos.longitude,
        blockCode:feature.blockCode||undefined,checklistSummary:checklistSummary.trim()||undefined
      });
      setTitle(''); setAssignedTo(''); setChecklistSummary('');
      setMessage('Inspection assigned. The worker must sign in with an identity matching the assigned account identifier.');
      await load();
    } catch(e:any) { setMessage(e?.message||'Could not create inspection.'); }
  }

  function editDraft(id:string,key:'findings'|'correctiveAction'|'evidenceReference',value:string) {
    setDrafts(old=>({...old,[id]:{findings:old[id]?.findings??'',correctiveAction:old[id]?.correctiveAction??'',evidenceReference:old[id]?.evidenceReference??'', [key]:value}}));
  }
  async function submitInspection(record:Inspection) {
    setMessage('');
    try {
      await postData(`/field-inspections/${record._id}/submit`,drafts[record._id]||{});
      setMessage('Inspection submitted for supervisor review.');
      await load();
    } catch(e:any) { setMessage(e?.message||'Could not submit inspection.'); }
  }
  async function review(record:Inspection,status:'verified'|'rejected') {
    const reviewNote=window.prompt(status==='verified'?'Enter verification note:':'Explain what needs correction:');
    if(!reviewNote?.trim()) { setMessage('A review note is required.'); return; }
    try {
      await postData(`/field-inspections/${record._id}/review`,{status,reviewNote});
      setMessage(status==='verified'?'Inspection verified.':'Inspection returned for correction.');
      await load();
    } catch(e:any) { setMessage(e?.message||'Could not review inspection. Owner access may be required.'); }
  }

  return (
    <div className="shell">
      <NavSidebar />
      <main id="main-content" className="main">
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <header style={{marginBottom:20}}>
            <h1>Field Inspection &amp; Location Integration</h1>
            <p>Assign a field inspection to a mapped location, capture findings, and submit it for supervisor verification.</p>
            <p><strong>Location note:</strong> a polygon's approximate average-vertex point may not be a safe entry point. Use a mapped gate/access point for navigation when available.</p>
          </header>
          {message?<div className="card" role="status" style={{marginBottom:16}}>{message}</div>:null}

          <section className="card" style={{marginBottom:20}}>
            <h2>Create and assign inspection</h2>
            {features.length===0?<p>No map features found. Add locations at <a href="/farm-map">Farm Mapping</a> first.</p>:null}
            <form onSubmit={createInspection} style={{display:'grid',gap:12,maxWidth:800}}>
              <label>Mapped location<select value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Choose location…</option>{features.map(f=><option key={f._id} value={f._id}>{f.label} — {f.featureType.replaceAll('_',' ')}{f.blockCode?` (${f.blockCode})`:''}</option>)}</select></label>
              <label>Inspection title (optional)<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></label>
              <label>Assigned worker identifier<input value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} maxLength={120} required placeholder="Use the worker's login email/username"/></label>
              <label>Activity<select value={activityType} onChange={e=>setActivityType(e.target.value as any)}><option value="eucalyptus">Eucalyptus</option><option value="beekeeping">Beekeeping</option><option value="infrastructure">Infrastructure</option><option value="general">General</option></select></label>
              <label>Inspection type<select value={inspectionType} onChange={e=>setInspectionType(e.target.value as any)}><option value="routine">Routine</option><option value="follow_up">Follow-up</option><option value="incident">Incident</option></select></label>
              <label>Checklist / scope summary (optional)<textarea value={checklistSummary} onChange={e=>setChecklistSummary(e.target.value)} maxLength={1000} rows={3}/></label>
              <button type="submit" disabled={!features.length}>Create inspection</button>
            </form>
          </section>

          <section className="card">
            <h2>Inspection register</h2>
            {loading?<p>Loading…</p>:records.length===0?<p>No inspections visible for this account.</p>:<div style={{overflowX:'auto'}}><table><thead><tr><th>Inspection</th><th>Location</th><th>Assigned to</th><th>Status</th><th>Directions</th><th>Worker action / review</th></tr></thead><tbody>
              {records.map(r=><tr key={r._id}><td>{r.title}<br/><small>{r.activityType} · {r.inspectionType}</small>{r.checklistSummary?<p>{r.checklistSummary}</p>:null}</td><td>{r.locationLabel}{r.blockCode?<><br/>Block: {r.blockCode}</>:null}<br/><small>{Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}</small></td><td>{r.assignedTo}</td><td>{r.status}{r.reviewNote?<p>{r.reviewNote}</p>:null}</td><td><a href={directions(r.latitude,r.longitude)} target="_blank" rel="noreferrer">Directions</a></td><td>
                {['open','rejected'].includes(r.status)?<div style={{minWidth:260,display:'grid',gap:6}}>
                  <textarea placeholder="Findings" value={drafts[r._id]?.findings??r.findings??''} onChange={e=>editDraft(r._id,'findings',e.target.value)} maxLength={1000}/>
                  <textarea placeholder="Corrective action" value={drafts[r._id]?.correctiveAction??r.correctiveAction??''} onChange={e=>editDraft(r._id,'correctiveAction',e.target.value)} maxLength={1000}/>
                  <input placeholder="Evidence reference (optional)" value={drafts[r._id]?.evidenceReference??r.evidenceReference??''} onChange={e=>editDraft(r._id,'evidenceReference',e.target.value)} maxLength={500}/>
                  <button type="button" onClick={()=>void submitInspection(r)}>Submit for review</button>
                </div>:null}
                {r.status==='submitted'?<div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button type="button" onClick={()=>void review(r,'verified')}>Verify</button><button type="button" onClick={()=>void review(r,'rejected')}>Return for correction</button></div>:null}
              </td></tr>)}
            </tbody></table></div>}
            <p style={{fontSize:13}}>Non-owner accounts should see only inspections assigned to their login identifier. Review controls are intended for owner accounts; verify authorization behaviour in your deployment.</p>
          </section>
        </div>
      </main>
    </div>
  );
}