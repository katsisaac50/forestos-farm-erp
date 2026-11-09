"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getData, postData } from "../../lib/api";

type Row = { _id: string; rowNumber: number; date: string; amountUgx: number; direction: string; description: string; reference?: string; matchStatus: string; suggestedTransactionId?: string; matchReason?: string; matchedTransactionId?: string };
type Import = { importId: string; accountName: string; month: string; fileName: string; rowCount: number; createdAt: string };
type Detail = { import: Import; summary: { total: number; matched: number; suggested: number; unmatched: number; ignored: number; duplicateLike: number }; rows: Row[] };
const fmt = (n: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(n) || 0);
const currentMonth = new Date().toISOString().slice(0, 7);
export default function StatementMatchingPage() {
  const [month, setMonth] = useState(currentMonth);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("Bank");
  const [file, setFile] = useState<File | null>(null);
  const [imports, setImports] = useState<Import[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadImports() {
    try { setImports(await getData<Import[]>(`/statement-matching/imports?month=${encodeURIComponent(month)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load imports."); }
  }
  useEffect(() => { void loadImports(); }, [month]);

  async function importFile(e: React.FormEvent) {
    e.preventDefault(); if (!file) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const csvText = await file.text();
      const result = await postData<Detail>("/statement-matching/imports", { accountName, accountType, month, fileName: file.name, csvText });
      setDetail(result); setMessage("Statement imported. Suggested matches require owner confirmation."); await loadImports();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); }
    finally { setLoading(false); }
  }
  async function openImport(id: string) {
    setLoading(true); setError(""); setMessage("");
    try { setDetail(await getData<Detail>(`/statement-matching/imports/${id}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not open import."); }
    finally { setLoading(false); }
  }
  async function decide(row: Row, decision: "confirm" | "reject" | "ignore") {
    let transactionId = row.suggestedTransactionId || "";
    if (decision === "confirm" && !transactionId) transactionId = window.prompt("Enter the matching ForestOS finance transaction MongoDB ID:") || "";
    if (decision === "confirm" && !transactionId) return;
    if (!detail) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const result = await postData<Detail>(`/statement-matching/imports/${detail.import.importId}/rows/${row._id}/decision`, { decision, transactionId });
      setDetail(result); setMessage(`Statement row ${row.rowNumber}: ${decision}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save decision."); }
    finally { setLoading(false); }
  }
  const inputStyle: React.CSSProperties = { display: "block", width: "100%", padding: "10px", marginTop: "5px", border: "1px solid #cbd5e1", borderRadius: "8px" };
  return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Financial controls</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/financial-reconciliation">Financial reconciliation</Link><Link href="/monthly-financial-report">Monthly financial report</Link><Link href="/finance">Finance ledger</Link></nav></aside>
  <main className="main"><p className="eyebrow">PHASE 47 · STATEMENT MATCHING</p><h1>Statement import &amp; transaction matching</h1>
  <p className="muted">Import a CSV statement, inspect exact-match suggestions and confirm matches manually. Imported rows never create finance ledger transactions.</p>
  <section className="panel"><h2>Import CSV statement</h2><p>Required headers: Date, Amount, Description. Optional: Direction, Reference. Amounts are interpreted as UGX. Without Direction, positive values are income and negative values are expenses.</p>
  <form onSubmit={importFile}><div className="grid">
  <label>Account name<input required style={inputStyle} value={accountName} onChange={e => setAccountName(e.target.value)} /></label>
  <label>Account type<select style={inputStyle} value={accountType} onChange={e => setAccountType(e.target.value)}><option>Bank</option><option>Cash</option><option>Mobile money</option><option>Other</option></select></label>
  <label>Month<input required type="month" style={inputStyle} value={month} onChange={e => setMonth(e.target.value)} /></label>
  <label>CSV file<input required type="file" accept=".csv,text/csv" style={inputStyle} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
  </div><p><button className="btn" disabled={loading || !file || !accountName.trim()}>{loading ? "Working…" : "Import statement"}</button></p></form>
  {message && <p>{message}</p>}{error && <p role="alert">{error}</p>}</section>
  <section className="panel"><h2>Imports for {month}</h2><button className="btn" onClick={() => void loadImports()}>Refresh imports</button><div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Account</th><th>File</th><th>Rows</th><th>Imported</th><th>Action</th></tr></thead><tbody>{imports.map(i => <tr key={i.importId}><td>{i.accountName}</td><td>{i.fileName}</td><td>{i.rowCount}</td><td>{i.createdAt ? new Date(i.createdAt).toLocaleString() : "—"}</td><td><button className="btn" onClick={() => void openImport(i.importId)}>Open</button></td></tr>)}{!imports.length && <tr><td colSpan={5}>No imports for this month.</td></tr>}</tbody></table></div></section>
  {detail && <><section className="grid"><div className="card"><div className="muted">Rows</div><div className="metric">{detail.summary.total}</div></div><div className="card"><div className="muted">Matched</div><div className="metric">{detail.summary.matched}</div></div><div className="card"><div className="muted">Suggested</div><div className="metric">{detail.summary.suggested}</div></div><div className="card"><div className="muted">Unmatched</div><div className="metric">{detail.summary.unmatched}</div></div><div className="card"><div className="muted">Possible duplicates</div><div className="metric">{detail.summary.duplicateLike}</div></div></section>
  <section className="panel"><h2>Statement rows — {detail.import.accountName}</h2><div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Date</th><th>Direction</th><th>Amount</th><th>Description</th><th>Reference</th><th>Status</th><th>Reason</th><th>Decision</th></tr></thead><tbody>{detail.rows.map(r => <tr key={r._id}><td>{r.date?.slice(0,10)}</td><td>{r.direction}</td><td>{fmt(r.amountUgx)}</td><td>{r.description}</td><td>{r.reference || "—"}</td><td>{r.matchStatus}</td><td>{r.matchReason || "—"}</td><td>{r.matchStatus !== "Matched" && r.matchStatus !== "Ignored" ? <><button className="btn" disabled={loading} onClick={() => void decide(r,"confirm")}>Confirm</button> <button className="btn" disabled={loading} onClick={() => void decide(r,"reject")}>Reject</button> <button className="btn" disabled={loading} onClick={() => void decide(r,"ignore")}>Ignore</button></> : "—"}</td></tr>)}</tbody></table></div></section></>}
  <section className="panel"><h2>Matching safeguards</h2><ul><li>Exact suggestions use date, amount and direction; the owner must confirm.</li><li>Multiple candidates are not auto-selected.</li><li>Confirmed matches require equal amount and direction and cannot reuse the same ledger transaction twice in one import.</li><li>Possible duplicates are heuristic warnings, not proof of fraud or duplication.</li><li>CSV import is limited to 5,000 rows and 2 MB of text in the API DTO.</li><li>Rows outside the selected month or with invalid dates/amounts are rejected.</li></ul></section>
  </main></div>;
}
