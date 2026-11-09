"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getData, postData, patchData } from "../../lib/api";

type CloseRecord = {
  _id: string; month: string; status: string; cashCountUgx: number;
  bankStatementBalanceUgx: number; mobileMoneyBalanceUgx: number; otherAccountBalanceUgx: number;
  checklist: Record<string, boolean>; preparerNote: string; varianceExplanation?: string;
  reviewerNote?: string; reopenReason?: string; preparedBy: string; reviewedBy?: string; closedAt?: string;
};
type Data = {
  month: string; generatedAt: string; close: CloseRecord | null;
  reconciliations: any[]; openEscalations: any[]; verifiedCapitalSpendUgx: number;
  pendingCapitalSpendUgx: number; controlSummary: Record<string, number>;
  requiredChecklist: string[]; warnings: string[];
};
const money = (n: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(n || 0);
const labels: Record<string,string> = {
 incomeExpenseReviewed: "Income and expense ledger reviewed",
 receiptsAndEvidenceReviewed: "Receipts and supporting evidence reviewed",
 cashCountCompleted: "Physical cash counted and recorded",
 bankAndMobileMoneyChecked: "Bank and mobile-money balances checked",
 capitalSpendReviewed: "Capital commitments and spend reviewed",
 openIssuesAssigned: "Open financial issues assigned for action",
 backupConfirmed: "Backup completed and recovery location checked",
 managementReviewCompleted: "Management review completed",
};
const monthNow = new Date().toISOString().slice(0,7);
const blank = () => ({month:monthNow,cashCountUgx:"0",bankStatementBalanceUgx:"0",mobileMoneyBalanceUgx:"0",otherAccountBalanceUgx:"0",preparerNote:"",varianceExplanation:"",checklist:{} as Record<string,boolean>});
export default function MonthlyFinancialClosePage() {
 const [month,setMonth] = useState(monthNow), [data,setData] = useState<Data|null>(null);
 const [form,setForm] = useState(blank()), [reviewerNote,setReviewerNote] = useState(""), [exceptionDisposition,setExceptionDisposition] = useState(""), [reopenReason,setReopenReason] = useState("");
 const [error,setError] = useState(""), [notice,setNotice] = useState(""), [loading,setLoading] = useState(false);
 async function load(m=month) {
  setLoading(true);
  try {
   const d = await getData<Data>(`/monthly-financial-close?month=${encodeURIComponent(m)}`);
   setData(d); setError("");
   if (d.close) setForm({month:d.close.month,cashCountUgx:String(d.close.cashCountUgx),bankStatementBalanceUgx:String(d.close.bankStatementBalanceUgx),mobileMoneyBalanceUgx:String(d.close.mobileMoneyBalanceUgx),otherAccountBalanceUgx:String(d.close.otherAccountBalanceUgx),preparerNote:d.close.preparerNote||"",varianceExplanation:d.close.varianceExplanation||"",checklist:d.close.checklist||{}});
   else setForm({...blank(),month:m});
  } catch(e) { setError(e instanceof Error?e.message:"Could not load monthly close. Sign in as owner."); }
  finally { setLoading(false); }
 }
 useEffect(()=>{void load(month)},[]);
 function update(key:string,value:any){setForm(x=>({...x,[key]:value}))}
 async function save(e:React.FormEvent) {
  e.preventDefault(); setError(""); setNotice("");
  try { await postData("/monthly-financial-close",{...form,cashCountUgx:Number(form.cashCountUgx),bankStatementBalanceUgx:Number(form.bankStatementBalanceUgx),mobileMoneyBalanceUgx:Number(form.mobileMoneyBalanceUgx),otherAccountBalanceUgx:Number(form.otherAccountBalanceUgx)}); setNotice("Monthly close draft saved. Review the source controls and exception list before closing."); await load(form.month); }
  catch(e){setError(e instanceof Error?e.message:"Could not save draft.");}
 }
 async function closePeriod(){
  if(!data?.close) return;
  setError("");setNotice("");
  try { await patchData(`/monthly-financial-close/${data.close._id}/review`,{reviewerNote,exceptionDisposition}); setNotice("Period closed. Reopen requires a documented reason."); await load(month); }
  catch(e){setError(e instanceof Error?e.message:"Could not close period.");}
 }
 async function reopenPeriod(){
  if(!data?.close) return;
  setError("");setNotice("");
  try { await patchData(`/monthly-financial-close/${data.close._id}/reopen`,{reason:reopenReason}); setNotice("Period reopened and reason recorded."); await load(month); }
  catch(e){setError(e instanceof Error?e.message:"Could not reopen period.");}
 }
 const closed = data?.close?.status==="closed";
 return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Monthly financial close</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/finance">Finance ledger</Link><Link href="/financial-reconciliation">Reconciliation</Link><Link href="/capital-spend-verification">Capital spending</Link><Link href="/financial-audit-trail">Audit trail</Link></nav></aside>
 <main className="main"><p className="eyebrow">PHASE 60 · FINANCIAL CLOSE & SYSTEM FINE-TUNING</p><h1>Monthly Financial Close</h1><p className="muted">A controlled month-end checklist connecting reconciliation, unresolved issues, capital spend evidence, backup confirmation and management sign-off.</p>
 <section className="panel"><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",marginTop:0}}><label>Reporting month<input className="input" type="month" value={month} onChange={e=>{setMonth(e.target.value);void load(e.target.value)}}/></label><div><div className="muted">Period status</div><div className="metric" style={{fontSize:20}}>{data?.close?.status||"Not started"}</div></div><div><div className="muted">Open escalations</div><div className="metric">{data?.controlSummary.openEscalationCount??"—"}</div></div><div><div className="muted">Pending capital spend</div><div className="metric" style={{fontSize:20}}>{money(data?.pendingCapitalSpendUgx||0)}</div></div></div><button className="btn" disabled={loading} onClick={()=>void load(month)}>{loading?"Loading…":"Refresh source records"}</button>{error&&<p className="alert danger" role="alert">{error}</p>}{notice&&<p className="alert success" role="status">{notice}</p>}</section>
 {data&&<><section className="panel"><h2>Source control snapshot</h2><div className="tableWrap"><table className="table"><thead><tr><th>Control</th><th>Result</th></tr></thead><tbody>
 <tr><td>Account reconciliations</td><td>{data.controlSummary.reviewedReconciliations??0} reviewed / {data.controlSummary.reconciliationCount??0} recorded</td></tr>
 <tr><td>Unresolved / unreviewed reconciliations</td><td>{data.controlSummary.unresolvedReconciliations??0}</td></tr>
 <tr><td>Critical open escalations</td><td>{data.controlSummary.criticalOpenEscalationCount??0}</td></tr>
 <tr><td>Verified capital spend recorded this month</td><td>{money(data.verifiedCapitalSpendUgx)}</td></tr>
 <tr><td>Spend awaiting verification</td><td>{money(data.pendingCapitalSpendUgx)} ({data.controlSummary.pendingSpendRecordCount??0} records)</td></tr>
 </tbody></table></div><p className="muted">These are source-register summaries, not proof that all business activity was captured. Investigate records missing from the system.</p>
 <h3>Reconciliation register</h3><div className="tableWrap"><table className="table"><thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Reviewed</th><th>Difference (UGX)</th></tr></thead><tbody>{data.reconciliations.map((r:any)=><tr key={r._id}><td>{r.accountName}</td><td>{r.accountType}</td><td>{r.status}</td><td>{r.reviewed?"Yes":"No"}</td><td>{money(r.closingDifferenceUgx)}</td></tr>)}{!data.reconciliations.length&&<tr><td colSpan={5}>No reconciliation records for this month.</td></tr>}</tbody></table></div>
 <h3>Unresolved financial escalations</h3><div className="tableWrap"><table className="table"><thead><tr><th>Reference</th><th>Priority</th><th>Title</th><th>Status</th><th>Assigned to</th></tr></thead><tbody>{data.openEscalations.map((e:any)=><tr key={e._id}><td>{e.escalationId}</td><td>{e.priority}</td><td>{e.title}</td><td>{e.status}</td><td>{e.assignedTo||"Unassigned"}</td></tr>)}{!data.openEscalations.length&&<tr><td colSpan={5}>No unresolved escalation found in the selected-month register.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>{closed?"Closed period record":"Prepare / update close checklist"}</h2>{closed?<><p>This period is marked closed. Editing is blocked until an authorised owner reopens it with a reason.</p><p><b>Prepared by:</b> {data.close?.preparedBy} · <b>Reviewed by:</b> {data.close?.reviewedBy||"—"} · <b>Closed:</b> {data.close?.closedAt?new Date(data.close.closedAt).toLocaleString():"—"}</p><label>Reason for reopening<input className="input" value={reopenReason} onChange={e=>setReopenReason(e.target.value)} placeholder="Explain the error or new evidence"/></label><button className="btn" onClick={()=>void reopenPeriod()}>Reopen with reason</button></>:<form onSubmit={save}><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))"}}>{[['cashCountUgx','Physical cash counted (UGX)'],['bankStatementBalanceUgx','Bank statement balance (UGX)'],['mobileMoneyBalanceUgx','Mobile money balance (UGX)'],['otherAccountBalanceUgx','Other account balance (UGX)']].map(([key,label])=><label key={key}>{label}<input className="input" type="number" min="0" step="1" required value={(form as any)[key]} onChange={e=>update(key,e.target.value)}/></label>)}</div><h3>Required checklist</h3><div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))"}}>{data.requiredChecklist.map(key=><label key={key} style={{display:"flex",gap:10,alignItems:"flex-start"}}><input style={{width:"auto",marginTop:3}} type="checkbox" checked={form.checklist[key]===true} onChange={e=>update("checklist",{...form.checklist,[key]:e.target.checked})}/><span>{labels[key]||key}</span></label>)}</div><label>Preparer note<textarea className="input" required minLength={8} value={form.preparerNote} onChange={e=>update("preparerNote",e.target.value)} placeholder="Summarise work completed, known omissions and outstanding concerns"/></label><label>Known variance / exception explanation<textarea className="input" value={form.varianceExplanation} onChange={e=>update("varianceExplanation",e.target.value)} placeholder="Explain differences; do not hide unresolved items"/></label><button className="btn" type="submit">Save close draft</button></form>}</section>
 {!closed&&data.close&&<section className="panel"><h2>Authorised review and close</h2><p className="muted">All checklist items must be checked. Unresolved reconciliation items or critical escalations require an explicit exception disposition; closing does not erase them.</p><label>Reviewer note<input className="input" value={reviewerNote} onChange={e=>setReviewerNote(e.target.value)} placeholder="What did you verify before sign-off?"/></label><label>Exception disposition (required only when unresolved/critical items remain)<textarea className="input" value={exceptionDisposition} onChange={e=>setExceptionDisposition(e.target.value)} placeholder="Name each outstanding issue, owner and follow-up date"/></label><button className="btn" onClick={()=>void closePeriod()}>Review and close month</button></section>}
 <section className="panel"><h2>Control boundaries</h2><ul>{data.warnings.map(w=><li key={w}>{w}</li>)}</ul><p className="muted">Generated {new Date(data.generatedAt).toLocaleString()}</p></section></>}
 </main></div>;
}