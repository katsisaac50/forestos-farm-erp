"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getData } from "../../lib/api";

type LedgerRow = {
  id: string; transactionId: string; date: string; direction: "Income" | "Expense" | "Transfer";
  businessLine: string; category: string; description: string; amountUgx: number;
  paymentMethod: string; reconciled: boolean; receiptReference?: string; counterparty?: string;
};
type Report = {
  month: string; currency: string; generatedAt: string; capped: boolean;
  totals: { incomeUgx: number; expenseUgx: number; transferUgx: number; netMovementUgx: number;
    recordCount: number; incomeCount: number; expenseCount: number; transferCount: number; unreconciledCount: number };
  byCategory: { direction: string; category: string; amountUgx: number; count: number }[];
  records: LedgerRow[]; notes: string[];
};
const money = (n: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const today = new Date().toISOString().slice(0, 7);

export default function MonthlyFinancialReportPage() {
  const [month, setMonth] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    getData<any>(`/financial-reports/monthly?month=${encodeURIComponent(month)}`)
      .then((data: Report) => { if (active) setReport(data); })
      .catch((e: unknown) => { if (active) { setReport(null); setError(e instanceof Error ? e.message : "Could not load report. Sign in as an owner and check the API connection."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, refresh]);

  const csv = () => {
    if (!report) return;
    const header = ["Date", "Transaction ID", "Direction", "Business line", "Category", "Description", "Amount UGX", "Payment method", "Reconciled", "Receipt reference", "Counterparty"];
    const rows = report.records.map(r => [r.date?.slice(0, 10), r.transactionId, r.direction, r.businessLine, r.category, r.description, r.amountUgx, r.paymentMethod, r.reconciled ? "Yes" : "No", r.receiptReference || "", r.counterparty || ""]);
    const content = [header, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\\r\\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `forestos-ledger-report-${month}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const records = useMemo(() => report?.records ?? [], [report]);
  return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Monthly financial reporting</div><nav className="nav"><Link href="/">Dashboard</Link><Link href="/reinvestment-intelligence">Reinvestment intelligence</Link><Link href="/budget-execution">Budget execution</Link><Link href="/resource-planning">Resource planning</Link><Link href="/finance">Finance ledger</Link><Link href="/cost-intelligence">Cost intelligence</Link><Link href="/cashflow">Cash flow &amp; capital</Link><Link href="/management-intelligence">Management intelligence</Link></nav></aside>
  <main className="main"><p className="eyebrow">PHASE 44 · PERSISTENT FINANCIAL REPORTING</p><h1>Monthly financial report</h1>
  <p className="muted">Owner-only report generated from existing saved finance ledger transactions. It is read-only and does not create duplicate ledger entries.</p>
  <section className="panel"><div className="grid"><label>Report month<input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} /></label><div><div className="muted">Report source</div><strong>Saved finance ledger</strong></div><div><div className="muted">Last generated</div><strong>{report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : "—"}</strong></div></div>
  <div className="row" style={{ marginTop: 12 }}><button className="btn" onClick={() => setRefresh(v => v + 1)} disabled={loading}>Refresh report</button><button className="btn" onClick={csv} disabled={!report}>Export CSV</button></div>
  {loading && <p className="muted">Loading saved transactions…</p>}{error && <p role="alert">{error}</p>}{report?.capped && <p role="alert">This month reached the 2,000-record reporting cap. Totals may be incomplete; do not rely on them until pagination or a narrower period is implemented.</p>}</section>
  {report && <><div className="grid"><div className="card"><div className="muted">Ledger income</div><div className="metric">{money(report.totals.incomeUgx)}</div><div className="muted">{report.totals.incomeCount} records</div></div><div className="card"><div className="muted">Ledger expenses</div><div className="metric">{money(report.totals.expenseUgx)}</div><div className="muted">{report.totals.expenseCount} records</div></div><div className="card"><div className="muted">Net movement</div><div className="metric">{money(report.totals.netMovementUgx)}</div><div className="muted">Income less expenses</div></div><div className="card"><div className="muted">Transfers</div><div className="metric">{money(report.totals.transferUgx)}</div><div className="muted">{report.totals.transferCount} records · excluded from net</div></div></div>
  <div className="grid" style={{ marginTop: 12 }}><div className="card"><div className="muted">Total ledger records</div><div className="metric">{report.totals.recordCount}</div></div><div className="card"><div className="muted">Not marked reconciled</div><div className="metric">{report.totals.unreconciledCount}</div></div></div>
  <section className="panel"><h2>Category breakdown</h2><div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Direction</th><th>Category</th><th>Records</th><th>Total (UGX)</th></tr></thead><tbody>{report.byCategory.map((r, i) => <tr key={`${r.direction}-${r.category}-${i}`}><td>{r.direction}</td><td>{r.category}</td><td>{r.count}</td><td>{money(r.amountUgx)}</td></tr>)}{report.byCategory.length === 0 && <tr><td colSpan={4}>No finance transactions recorded for this month.</td></tr>}</tbody></table></div></section>
  <section className="panel"><h2>Saved ledger transactions</h2><div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Date</th><th>Transaction ID</th><th>Direction</th><th>Business line</th><th>Category</th><th>Description</th><th>Amount (UGX)</th><th>Method</th><th>Reconciled</th></tr></thead><tbody>{records.map(r => <tr key={r.id}><td>{r.date?.slice(0, 10)}</td><td>{r.transactionId}</td><td>{r.direction}</td><td>{r.businessLine}</td><td>{r.category}</td><td>{r.description}</td><td>{money(Number(r.amountUgx) || 0)}</td><td>{r.paymentMethod}</td><td>{r.reconciled ? "Yes" : "No"}</td></tr>)}{records.length === 0 && <tr><td colSpan={9}>No saved transactions for this month.</td></tr>}</tbody></table></div></section>
  <section className="panel"><h2>Reporting notes</h2><ul>{report.notes.map((n, i) => <li key={i}>{n}</li>)}</ul><p className="muted">This summary is not an audited financial statement, tax report, or bank reconciliation. Confirm the underlying ledger, receipts and bank records.</p></section></>}
  </main></div>;
}
