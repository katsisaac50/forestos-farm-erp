"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {getData,postData,patchData} from "../../lib/api";
type Item={investigationId:string;month:string;exceptionType:string;sourceReference:string;title:string;description:string;priority:string;status:string;assignedTo:string;dueDate:string;evidenceReference?:string;resolutionNote?:string;history:any[]};
const monthNow=new Date().toISOString().slice(0,7);
const style:React.CSSProperties={display:"block",width:"100%",padding:"10px",marginTop:"5px",border:"1px solid #cbd5e1",borderRadius:"8px"};
export default function FinancialInvestigationsPage(){
 const [month,setMonth]=useState(monthNow),[items,setItems]=useState<Item[]>([]),[title,setTitle]=useState(""),[type,setType]=useState("Missing receipt"),[ref,setRef]=useState(""),[description,setDescription]=useState(""),[priority,setPriority]=useState("Medium"),[assigned,setAssigned]=useState("Owner"),[due,setDue]=useState(new Date(Date.now()+7*86400000).toISOString().slice(0,10)),[error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 async function load(){setLoading(true);setError("");try{setItems(await getData<Item[]>(`/financial-investigations?month=${encodeURIComponent(month)}`))}catch(e){setError(e instanceof Error?e.message:"Unable to load investigations")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[month]);
 async function create(e:React.FormEvent){e.preventDefault();setError("");setMessage("");setLoading(true);try{await postData("/financial-investigations",{month,exceptionType:type,sourceReference:ref,title,description,priority,assignedTo:assigned,dueDate:new Date(due+"T12:00:00").toISOString()});setMessage("Investigation created.");setTitle("");setRef("");setDescription("");await load()}catch(e){setError(e instanceof Error?e.message:"Could not create investigation")}finally{setLoading(false)}}
 async function update(id:string,body:any){setError("");setMessage("");setLoading(true);try{await patchData(`/financial-investigations/${id}`,body);setMessage("Investigation updated.");await load()}catch(e){setError(e instanceof Error?e.message:"Could not update investigation")}finally{setLoading(false)}}
 return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Financial governance</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/financial-exceptions">Financial exceptions</Link><Link href="/statement-matching">Statement matching</Link><Link href="/financial-reconciliation">Reconciliation</Link></nav></aside>
 <main className="main"><p className="eyebrow">PHASE 49 · INVESTIGATION WORKFLOW</p><h1>Financial investigations &amp; corrective actions</h1><p className="muted">Create an investigation from an exception, assign responsibility, capture evidence references and document resolution. Creating an investigation does not change ledger transactions.</p>
 <section className="panel"><label>Filter month<input className="input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="btn" onClick={()=>void load()} disabled={loading}>Refresh</button>{error&&<p role="alert">{error}</p>}{message&&<p>{message}</p>}</section>
 <section className="panel"><h2>Open a financial investigation</h2><form onSubmit={create}><div className="grid">
 <label>Exception type<select style={style} value={type} onChange={e=>setType(e.target.value)}><option>Missing receipt</option><option>Possible duplicate</option><option>Unmatched statement row</option><option>Reconciliation difference</option><option>Other</option></select></label>
 <label>Source reference<input required style={style} value={ref} onChange={e=>setRef(e.target.value)} placeholder="Transaction ID or statement row reference"/></label>
 <label>Title<input required style={style} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Priority<select style={style} value={priority} onChange={e=>setPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label>
 <label>Assigned to<input required style={style} value={assigned} onChange={e=>setAssigned(e.target.value)}/></label>
 <label>Due date<input required type="date" style={style} value={due} onChange={e=>setDue(e.target.value)}/></label>
 </div><label>Description<textarea required style={style} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><p><button className="btn" disabled={loading}>Create investigation</button></p></form></section>
 <section className="panel"><h2>Investigation register</h2>{loading&&<p className="muted">Loading…</p>}<div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Title / source</th><th>Type</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Status</th><th>Evidence / resolution</th><th>Actions</th></tr></thead><tbody>
 {items.map(i=><tr key={i.investigationId}><td><strong>{i.title}</strong><br/>{i.sourceReference}<br/><small>{i.description}</small></td><td>{i.exceptionType}</td><td>{i.priority}</td><td>{i.assignedTo}</td><td>{String(i.dueDate).slice(0,10)}</td><td>{i.status}</td><td>{i.evidenceReference||"No evidence reference"}{i.resolutionNote&&<p>{i.resolutionNote}</p>}</td><td>
 {i.status!=="Closed - reviewed"&&<div style={{display:"grid",gap:5}}>
 <button className="btn" disabled={loading} onClick={()=>void update(i.investigationId,{status:"Under investigation"})}>Investigating</button>
 <button className="btn" disabled={loading} onClick={()=>{const evidence=window.prompt("Evidence reference (file path, receipt reference or document ID):");if(evidence!==null)void update(i.investigationId,{status:"Awaiting evidence",evidenceReference:evidence})}}>Await evidence</button>
 <button className="btn" disabled={loading} onClick={()=>{const resolutionNote=window.prompt("Required resolution note:");if(resolutionNote?.trim())void update(i.investigationId,{status:"Resolved",resolutionNote})}}>Resolve</button>
 {i.status==="Resolved"&&<button className="btn" disabled={loading} onClick={()=>{const reviewNote=window.prompt("Required review note:");if(reviewNote?.trim())void update(i.investigationId,{status:"Closed - reviewed",reviewNote})}}>Close reviewed</button>}
 </div>}</td></tr>)}
 {!items.length&&!loading&&<tr><td colSpan={8}>No investigations for this month.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>Governance notes</h2><ul><li>Resolution requires a note; closing a resolved investigation requires a review note.</li><li>Each status update adds an application history entry and an audit event.</li><li>Evidence is stored as a reference only; this workflow does not upload or validate evidence files.</li><li>Assigned-to is a text field, not an authenticated user assignment system.</li><li>This is a management workflow, not a substitute for statutory accounting controls.</li></ul></section>
 </main></div>
}
