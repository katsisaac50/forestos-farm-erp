'use client';
import {useEffect,useState} from 'react';
import {getData} from '../../lib/api';
type Issue={severity:string;area:string;code:string;title:string;detail:string;action:string;recordId:string};
type Report={generatedAt:string;note:string;scope:Record<string,number>;counts:Record<string,number>;totalIssues:number;issues:Issue[]};
export default function DataIntegrityPage(){
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{setError('');setReport(await getData<any>('/data-integrity/report'));}catch(e:any){setError(e?.message||'Could not run the integrity scan. Sign in as owner.');}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 const issues=(report?.issues||[]).filter(x=>filter==='all'||x.severity===filter);
 return <main className="page-shell"><header className="page-header"><div><p className="eyebrow">FORESTOS · PHASE 23</p><h1>Data quality & integrity</h1><p>Read-only checks for inconsistencies across finance, inventory, workflows, inspections, risks, and workforce tasks.</p></div><div className="actions"><button disabled={busy} onClick={load}>{busy?'Scanning…':'Run scan'}</button><a className="button-secondary" href="/">Dashboard</a></div></header>
 <section className="notice"><strong>Read-only safety:</strong> this scan flags possible issues. It does not change stock balances, edit transactions, delete duplicates, or automatically reconcile records. Investigate source documents before making corrections.</section>
 {error&&<div className="notice">{error}</div>}
 {report&&<><p className="muted">Generated {new Date(report.generatedAt).toLocaleString()} · {report.note}</p>
 <section className="metric-grid">{[['Total issues',report.totalIssues],['High priority',report.counts.high||0],['Medium priority',report.counts.medium||0],['Finance records',report.scope.financeRecords],['Stock items',report.scope.stockItems],['Stock movements',report.scope.stockMovements],['Workflow events',report.scope.workflowEvents]].map(([k,v])=><article className="metric-card" key={String(k)}><span>{k}</span><strong>{Number(v||0).toLocaleString()}</strong></article>)}</section>
 <section className="panel"><div className="section-heading"><h2>Integrity issue register</h2><label>Severity<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div>
 <div className="table-wrap"><table><thead><tr><th>Severity</th><th>Area / check</th><th>Finding</th><th>Details</th><th>Recommended review</th></tr></thead><tbody>{issues.map((x,i)=><tr key={`${x.code}-${x.recordId}-${i}`}><td><span className={'status-pill status-'+(x.severity==='high'?'failed':x.severity==='medium'?'pending':'processed')}>{x.severity}</span></td><td>{x.area}<small>{x.code}</small></td><td><strong>{x.title}</strong></td><td>{x.detail}</td><td>{x.action}</td></tr>)}</tbody></table>{!issues.length&&<p className="muted">No issues match this filter. This is not a guarantee that all records are correct.</p>}</div></section>
 <section className="panel"><h2>Scan coverage</h2><div className="coverage-grid">{Object.entries(report.scope).map(([k,v])=><div key={k}><span>{k.replace(/([A-Z])/g,' $1')}</span><strong>{v.toLocaleString()}</strong></div>)}</div></section></>}
 </main>;
}
