'use client';
import {useEffect,useState} from 'react';
import {getData,postData} from '../../lib/api';
type Row={_id:string;backupDate:string;backupType:string;location:string;fileName:string;sizeBytes:number;checksum:string;status:string;verificationMethod:string;retentionUntil:string;verificationNotes:string};
type Dash={totals:{records:number;verified:number;failed:number;latestStatus:string};records:Row[]};
export default function BackupContinuityPage(){
 const [dash,setDash]=useState<Dash|null>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [f,setF]=useState({backupDate:new Date().toISOString().slice(0,10),backupType:'full',location:'',fileName:'',sizeBytes:'0',checksum:'',retentionUntil:'',notes:''});
 const [v,setV]=useState({id:'',verificationMethod:'restore_test',passed:true,notes:''});
 const [d,setD]=useState({drillDate:new Date().toISOString().slice(0,10),result:'not_run',environment:'isolated test environment',summary:'',notes:''});
 async function load(){try{setError('');setDash(await getData<any>('/backup-continuity/dashboard'));}catch(e:any){setError(e?.message||'Could not load backup continuity register. Sign in as owner.');}}
 useEffect(()=>{load();},[]);
 async function create(e:any){e.preventDefault();setBusy(true);setMessage('');try{await postData('/backup-continuity/records',{...f,sizeBytes:Number(f.sizeBytes)});setMessage('Backup record saved. This records metadata; it does not create a backup file.');await load();}catch(e:any){setError(e?.message||'Could not save backup record.');}finally{setBusy(false);}}
 async function verify(e:any){e.preventDefault();setBusy(true);try{await postData(`/backup-continuity/records/${v.id}/verify`,{verificationMethod:v.verificationMethod,passed:v.passed,notes:v.notes});setMessage('Verification result saved. Only record tests actually performed.');await load();}catch(e:any){setError((e as any)?.message||'Could not save verification.');}finally{setBusy(false);}}
 async function drill(e:any){e.preventDefault();setBusy(true);try{await postData('/backup-continuity/recovery-drill',{...d});setMessage('Recovery drill record saved. Only mark pass after completing a real restore test.');await load();}catch(e:any){setError((e as any)?.message||'Could not save drill.');}finally{setBusy(false);}}
 const bytes=(n:number)=>n>=1024**3?`${(n/1024**3).toFixed(2)} GB`:n>=1024**2?`${(n/1024**2).toFixed(2)} MB`:n>=1024?`${(n/1024).toFixed(2)} KB`:`${n||0} bytes`;
 return <main className="page-shell"><header className="page-header"><div><p className="eyebrow">FORESTOS · PHASE 24</p><h1>Backup, recovery & continuity</h1><p>Track backup evidence, verification, retention, and recovery drills.</p></div><div className="actions"><button onClick={load}>Refresh</button><a className="button-secondary" href="/">Dashboard</a></div></header>
 <section className="notice"><strong>Critical distinction:</strong> this page is a backup register, not a backup engine. It does not run mongodump, copy uploads, encrypt files, or upload to cloud storage. Store backups separately from production and periodically test restoration in an isolated environment.</section>
 {error&&<div className="notice">{error}</div>}{message&&<div className="notice">{message}</div>}
 {dash&&<section className="metric-grid">{[['Backup records',dash.totals.records],['Verified records',dash.totals.verified],['Failed verification',dash.totals.failed],['Latest status',dash.totals.latestStatus]].map(([k,val])=><article className="metric-card" key={String(k)}><span>{k}</span><strong>{String(val??'—')}</strong></article>)}</section>}
 <section className="panel"><h2>Record a completed backup</h2><p className="muted">Only create this record after the backup file or snapshot actually exists.</p><form className="form-grid" onSubmit={create}>
 <label>Backup date<input type="date" required value={f.backupDate} onChange={e=>setF({...f,backupDate:e.target.value})}/></label>
 <label>Type<select value={f.backupType} onChange={e=>setF({...f,backupType:e.target.value})}><option value="database">Database</option><option value="uploads">Uploads / evidence</option><option value="full">Full backup</option></select></label>
 <label>Protected location / storage label<input required value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="e.g. encrypted off-site storage"/></label>
 <label>File or snapshot name<input value={f.fileName} onChange={e=>setF({...f,fileName:e.target.value})}/></label>
 <label>Size in bytes<input type="number" min="0" value={f.sizeBytes} onChange={e=>setF({...f,sizeBytes:e.target.value})}/></label>
 <label>Checksum / hash<input value={f.checksum} onChange={e=>setF({...f,checksum:e.target.value})} placeholder="Optional SHA-256 value"/></label>
 <label>Retention until<input type="date" value={f.retentionUntil} onChange={e=>setF({...f,retentionUntil:e.target.value})}/></label>
 <label className="full-width">Notes<textarea value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label>
 <div className="full-width"><button disabled={busy} type="submit">{busy?'Saving…':'Save backup record'}</button></div></form></section>
 <section className="panel"><h2>Verify a backup</h2><form className="form-grid" onSubmit={verify}>
 <label>Backup record<select required value={v.id} onChange={e=>setV({...v,id:e.target.value})}><option value="">Select record</option>{(dash?.records||[]).map(r=><option key={r._id} value={r._id}>{r.backupDate} · {r.backupType} · {r.fileName||r.location} · {r.status}</option>)}</select></label>
 <label>Verification method<select value={v.verificationMethod} onChange={e=>setV({...v,verificationMethod:e.target.value})}><option value="restore_test">Restore test</option><option value="checksum">Checksum verification</option><option value="manual_review">Manual review</option></select></label>
 <label>Result<select value={String(v.passed)} onChange={e=>setV({...v,passed:e.target.value==='true'})}><option value="true">Passed</option><option value="false">Failed</option></select></label>
 <label className="full-width">Evidence / notes<textarea required value={v.notes} onChange={e=>setV({...v,notes:e.target.value})} placeholder="Describe what was checked and the evidence."/></label>
 <div className="full-width"><button disabled={busy||!v.id} type="submit">Save verification result</button></div></form></section>
 <section className="panel"><h2>Recovery drill register</h2><p className="muted">Run restoration only against an isolated test environment. Never experiment with production data.</p><form className="form-grid" onSubmit={drill}>
 <label>Drill date<input type="date" required value={d.drillDate} onChange={e=>setD({...d,drillDate:e.target.value})}/></label>
 <label>Result<select value={d.result} onChange={e=>setD({...d,result:e.target.value})}><option value="not_run">Not run / planned</option><option value="pass">Passed</option><option value="fail">Failed</option></select></label>
 <label>Test environment<input required value={d.environment} onChange={e=>setD({...d,environment:e.target.value})}/></label>
 <label className="full-width">Drill summary<textarea required value={d.summary} onChange={e=>setD({...d,summary:e.target.value})} placeholder="What was restored, what was checked, and how long did it take?"/></label>
 <label className="full-width">Follow-up actions<textarea value={d.notes} onChange={e=>setD({...d,notes:e.target.value})}/></label>
 <div className="full-width"><button disabled={busy} type="submit">Save recovery drill</button></div></form></section>
 <section className="panel"><h2>Backup register</h2><div className="table-wrap"><table><thead><tr><th>Date / type</th><th>Storage</th><th>Size</th><th>Status</th><th>Verification</th><th>Retention</th></tr></thead><tbody>{(dash?.records||[]).map(r=><tr key={r._id}><td>{r.backupDate}<small>{r.backupType}</small><small>{r.fileName}</small></td><td>{r.location}<small>{r.checksum?`Hash: ${r.checksum}`:'No checksum recorded'}</small></td><td>{bytes(r.sizeBytes)}</td><td><span className={'status-pill status-'+(r.status==='verified'?'processed':r.status==='failed'?'failed':'pending')}>{r.status}</span></td><td>{r.verificationMethod||'Not verified'}<small>{r.verificationNotes||'—'}</small></td><td>{r.retentionUntil||'Not set'}</td></tr>)}</tbody></table>{!dash?.records?.length&&<p className="muted">No backup records have been added yet.</p>}</div></section>
 <section className="panel"><h2>Minimum continuity policy</h2><ol><li>Keep multiple backup copies, including one off-site or in a separate protected cloud account.</li><li>Encrypt backup files and restrict access to trusted administrators.</li><li>Back up both MongoDB data and uploaded evidence/files, if used.</li><li>Keep a documented retention schedule; do not keep all copies on the production machine.</li><li>Test restoration periodically and record the outcome, recovery time, and missing data.</li></ol></section>
 </main>;
}
