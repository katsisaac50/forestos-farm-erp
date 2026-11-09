"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getData, postData, patchData } from "../../lib/api";

type Reconciliation = {
  _id: string; accountName: string; accountType: string; month: string;
  openingBalanceUgx: number; statementClosingBalanceUgx: number;
  statementIncomeUgx: number; statementExpenseUgx: number;
  ledgerIncomeUgx: number; ledgerExpenseUgx: number;
  expectedClosingBalanceUgx: number; closingDifferenceUgx: number;
  status: string; preparedBy: string; reviewed: boolean; reviewedBy?: string; notes?: string;
};
const fmt = (n: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(n) || 0);
const currentMonth = new Date().toISOString().slice(0, 7);
export default function FinancialReconciliationPage() {
  const [month, setMonth] = useState(currentMonth);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("Bank");
  const [opening, setOpening] = useState("0");
  const [closing, setClosing] = useState("0");
  const [income, setIncome] = useState("0");
  const [expense, setExpense] = useState("0");
  const [notes, setNotes] = useState("");
  const [records, setRecords] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setRecords(await getData<Reconciliation[]>(`/financial-reconciliation?month=${encodeURIComponent(month)}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load reconciliations."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [month]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage(""); setError("");
    try {
      await postData("/financial-reconciliation", {
        accountName, accountType, month,
        openingBalanceUgx: Number(opening), statementClosingBalanceUgx: Number(closing),
        statementIncomeUgx: Number(income), statementExpenseUgx: Number(expense), notes
      });
      setMessage("Reconciliation snapshot saved."); setAccountName(""); setNotes(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save reconciliation."); }
  }
  async function review(id: string) {
    const note = window.prompt("Review note (optional):") || "";
    setError(""); setMessage("");
    try { await patchData(`/financial-reconciliation/${id}/review`, { notes: note }); setMessage("Marked as reviewed."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update review."); }
  }
  const inputStyle: React.CSSProperties = { display: "block", width: "100%", padding: "10px", marginTop: "5px", border: "1px solid #cbd5e1", borderRadius: "8px" };
  return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Financial controls</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/monthly-financial-report">Monthly financial report</Link><Link href="/finance">Finance ledger</Link><Link href="/cashflow">Cash flow &amp; capital</Link><Link href="/management-intelligence">Management intelligence</Link></nav></aside>
  <main className="main"><p className="eyebrow">PHASE 46 · CASH CONTROL</p><h1>Financial reconciliation</h1>
  <p className="muted">Record a statement or counted balance, calculate its expected closing balance, compare the difference and log an owner review.</p>
  <section className="panel"><label>Month<input style={inputStyle} type="month" value={month} onChange={e => setMonth(e.target.value)} /></label></section>
  <section className="panel"><h2>New reconciliation snapshot</h2><p className="muted">Use one record per account and month. The saved ledger totals are shown for context; they are not automatically matched to this individual account.</p>
  <form onSubmit={submit}><div className="grid">
    <label>Account name<input required style={inputStyle} value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Farm operating bank" /></label>
    <label>Account type<select style={inputStyle} value={accountType} onChange={e => setAccountType(e.target.value)}><option>Bank</option><option>Cash</option><option>Mobile money</option><option>Other</option></select></label>
    <label>Opening balance (UGX)<input required min="0" type="number" style={inputStyle} value={opening} onChange={e => setOpening(e.target.value)} /></label>
    <label>Statement income (UGX)<input required min="0" type="number" style={inputStyle} value={income} onChange={e => setIncome(e.target.value)} /></label>
    <label>Statement expenses (UGX)<input required min="0" type="number" style={inputStyle} value={expense} onChange={e => setExpense(e.target.value)} /></label>
    <label>Statement closing balance (UGX)<input required min="0" type="number" style={inputStyle} value={closing} onChange={e => setClosing(e.target.value)} /></label>
  </div><label>Notes<textarea style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Statement date, cash count, missing receipts…" /></label><p><button className="btn" disabled={loading || !accountName.trim()}>Save reconciliation</button></p></form>
  {message && <p>{message}</p>}{error && <p role="alert">{error}</p>}</section>
  <section className="panel"><div className="row"><h2>Saved reconciliation records</h2><button className="btn" onClick={() => void load()} disabled={loading}>Refresh</button></div>
  {loading && <p className="muted">Loading…</p>}
  <div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Account</th><th>Type</th><th>Month</th><th>Opening</th><th>Statement close</th><th>Expected close</th><th>Difference</th><th>Status</th><th>Review</th></tr></thead><tbody>
  {records.map(r => <tr key={r._id}><td>{r.accountName}</td><td>{r.accountType}</td><td>{r.month}</td><td>{fmt(r.openingBalanceUgx)}</td><td>{fmt(r.statementClosingBalanceUgx)}</td><td>{fmt(r.expectedClosingBalanceUgx)}</td><td>{fmt(r.closingDifferenceUgx)}</td><td>{r.status}</td><td>{r.reviewed ? `Reviewed by ${r.reviewedBy || "owner"}` : <button className="btn" onClick={() => void review(r._id)}>Mark reviewed</button>}</td></tr>)}
  {!records.length && !loading && <tr><td colSpan={9}>No reconciliation records for this month.</td></tr>}</tbody></table></div></section>
  <section className="panel"><h2>Controls and limitations</h2><ul><li>Expected closing balance = opening balance + statement income − statement expenses.</li><li>A difference greater than 1 UGX is flagged. This does not prove every ledger entry matches the statement.</li><li>Ledger totals displayed in saved records are all finance ledger entries for that month, not account-specific totals.</li><li>One account/month pair can only be saved once; correct or replace records through a controlled future amendment workflow.</li><li>This is a management control register, not a bank feed or audited reconciliation.</li></ul></section>
  </main></div>;
}
