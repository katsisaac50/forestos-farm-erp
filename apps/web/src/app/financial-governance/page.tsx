"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getData } from "../../lib/api";
type Scorecard = {
 month:string; generatedAt:string; summary:Record<string,number>;
 investigationQueue:Array<{investigationId:string;title:string;priority:string;status:string;assignedTo:string;dueDate:string;overdue:boolean}>;
 reconciliationQueue:Array<{accountName:string;accountType:string;status:string;reviewed:boolean;closingDifferenceUgx:number}>;
 statementStatusCounts:Array<{status:string;count:number}>;
 dataLimitsReached:boolean; warnings:string[]; interpretation:string[];
};
const fmt=(n:number)=>new Intl.NumberFormat("en-UG",{style:"currency",currency:"UGX",maximumFractionDigits:0}).format(Number(n)||0);
export default function FinancialGovernancePage(){
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 const [report,setReport]=useState<Scorecard|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 async function load(){setLoading(true);setError("");try{setReport(await getData<Scorecard>(`/financial-governance?month=${encodeURIComponent(month)}`))}catch(e){setError(e instanceof Error?e.message:"Unable to load scorecard")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[month]);
 const metrics:[string,string,boolean?][]=[
 ["Outstanding investigations","outstandingInvestigations"],["Overdue investigations","overdueInvestigations"],
 ["Reconciliations needing attention","reconciliationsNeedingAttention"],["Missing receipt references","missingReceiptReferences"],
 ["Possible duplicate groups","possibleDuplicateGroups"],["Statement matching rate","matchingRatePercent"],
 ["Average resolution time (days)","averageResolutionDays"],["Ledger transactions","ledgerTransactions"]
 ];
 return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Financial governance</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/financial-exceptions">Financial exceptions</Link><Link href="/financial-investigations">Investigations</Link><Link href="/financial-reconciliation">Reconciliation</Link><Link href="/statement-matching">Statement matching</Link><Link href="/monthly-financial-report">Monthly report</Link></nav></aside>
 <main className="main"><p className="eyebrow">PHASE 50 · FINANCIAL GOVERNANCE</p><h1>Financial governance scorecard</h1><p className="muted">An owner-level view of open control issues, statement matching and investigation performance. Indicators help prioritise review; they do not establish fraud.</p>
 <section className="panel"><label>Report month<input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label> <button className="btn" onClick={()=>void load()} disabled={loading}>{loading?"Loading…":"Refresh"}</button>{error&&<p role="alert">{error}</p>}{report&&<p className="muted">Generated {new Date(report.generatedAt).toLocaleString()}</p>}</section>
 {report&&<><div className="grid">{metrics.map(([label,key])=><div className="card" key={key}><div className="muted">{label}</div><div className="metric">{key==="matchingRatePercent"?`${report.summary[key]??0}%`:report.summary[key]??0}</div></div>)}</div>
 {report.dataLimitsReached&&<section className="panel"><h2>Data coverage warning</h2><ul>{report.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></section>}
 <section className="panel"><h2>Priority investigation queue</h2><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Reference</th><th>Issue</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Due date</th><th>Flag</th></tr></thead><tbody>{report.investigationQueue.map(x=><tr key={x.investigationId}><td>{x.investigationId}</td><td>{x.title}</td><td>{x.priority}</td><td>{x.status}</td><td>{x.assignedTo}</td><td>{x.dueDate?new Date(x.dueDate).toLocaleDateString():"—"}</td><td>{x.overdue?"OVERDUE":"—"}</td></tr>)}{!report.investigationQueue.length&&<tr><td colSpan={7}>No outstanding investigations for this month.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>Reconciliation review queue</h2><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Reviewed</th><th>Closing difference</th></tr></thead><tbody>{report.reconciliationQueue.map((x,i)=><tr key={`${x.accountName}-${i}`}><td>{x.accountName}</td><td>{x.accountType}</td><td>{x.status}</td><td>{x.reviewed?"Yes":"No"}</td><td>{fmt(x.closingDifferenceUgx)}</td></tr>)}{!report.reconciliationQueue.length&&<tr><td colSpan={5}>No reconciliation records need attention.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>Statement matching status</h2><div className="grid">{report.statementStatusCounts.map(x=><div className="card" key={x.status}><div className="muted">{x.status}</div><div className="metric">{x.count}</div></div>)}</div><p className="muted">Matching rate is matched rows divided by eligible retrieved rows (ignored rows excluded).</p></section>
 <section className="panel"><h2>How to use this scorecard</h2><ol>{report.interpretation.map((n,i)=><li key={i}>{n}</li>)}</ol><p><Link href="/financial-investigations">Open investigation register</Link> · <Link href="/financial-exceptions">Review exception report</Link></p></section></>}
 </main></div>;
}
