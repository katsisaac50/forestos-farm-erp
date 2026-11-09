"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getData } from "../../lib/api";

type Finding = { code: string; severity: string; spendRecordId?: string; relatedSpendRecordId?: string | null; message: string };
type ProposalReport = {
  proposalId: string; proposalCode?: string; businessLine?: string; status?: string;
  approvedAmountUgx: number | null; grossOriginalVerifiedSpendUgx: number;
  validReversalTotalUgx: number; netSpendUgx: number | null;
  remainingApprovedAmountUgx: number | null; storedCommitmentCounterUgx: number | null;
  counterVarianceUgx: number | null; findings: Finding[];
};
type Report = {
  runId: string; asOf: string; readOnly: boolean; isPartial: boolean;
  warning: string | null; scanned: { spendRecords: number; proposals: number };
  totals: { proposalCount: number; criticalFindingCount: number; highFindingCount: number };
  proposals: ProposalReport[];
};
const money = (n: number | null | undefined) => n == null ? "—" : new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(n) || 0);
const severityRank: Record<string, number> = { critical: 0, high: 1, review: 2, medium: 3, low: 4 };
export default function FinancialDiscrepanciesPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState("all");
  const [line, setLine] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setReport(await getData<Report>("/capital-spend-verification/reconciliation")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load financial reconciliation. Sign in as an authorised owner."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    if (!report) return [];
    return report.proposals.map((p) => ({ ...p, findings: [...(p.findings || [])].sort((a,b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)) }))
      .filter((p) => line === "all" || p.businessLine === line)
      .filter((p) => !search || `${p.proposalCode || ""} ${p.proposalId} ${p.findings.map(f => `${f.code} ${f.message}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => severity === "all" ? true : p.findings.some(f => f.severity === severity));
  }, [report, line, search, severity]);

  const findingCount = (r: Report | null, sev?: string) => (r?.proposals || []).reduce((n, p) => n + p.findings.filter(f => !sev || f.severity === sev).length, 0);
  return <div className="shell"><aside className="sidebar"><div className="brand">🌳 ForestOS</div><div className="sub">Masulita Green Farms</div><nav className="nav">
    <Link href="/">Dashboard</Link><Link href="/capital-spend-verification">Capital spending</Link><Link href="/financial-reconciliation">Statement reconciliation</Link><Link href="/financial-discrepancies">Financial discrepancies</Link><Link href="/audit">Audit trail</Link>
  </nav></aside><main className="main">
    <div className="pageHeader"><div><p className="eyebrow">FINANCIAL CONTROL · PHASE 70</p><h1>Financial discrepancies</h1><p className="muted">Read-only view of differences found by the reconciliation service. Investigate before taking corrective action.</p></div><button className="btn" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh report"}</button></div>
    {error && <div className="card error"><strong>Could not load report</strong><p>{error}</p><p>Check the API is running and sign in with an authorised owner account.</p></div>}
    {report && <>
      <div className="card"><div className="row"><span><strong>Run:</strong> {report.runId}</span><span><strong>As of:</strong> {new Date(report.asOf).toLocaleString()}</span><span><strong>Records scanned:</strong> {report.scanned.spendRecords} spends / {report.scanned.proposals} proposals</span><span><strong>Mode:</strong> {report.readOnly ? "Read-only" : "Unknown"}</span></div>
      {report.isPartial && <p className="error"><strong>Partial report:</strong> {report.warning || "Source scan limits were reached. Do not treat this as a complete reconciliation."}</p>}
      {!report.isPartial && <p className="muted">The source scan did not exceed configured record limits. This is still a diagnostic report, not a database snapshot or an accounting close.</p>}</div>
      <div className="grid cards"><div className="card"><div className="muted">Proposals scanned</div><div className="metric">{report.totals.proposalCount}</div></div><div className="card"><div className="muted">Critical findings</div><div className="metric">{findingCount(report,"critical")}</div></div><div className="card"><div className="muted">High findings</div><div className="metric">{findingCount(report,"high")}</div></div><div className="card"><div className="muted">All findings</div><div className="metric">{findingCount(report)}</div></div></div>
      <div className="panel"><h2>Filter discrepancies</h2><div className="row">
        <label style={{flex:"1 1 180px"}}>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="review">Review</option></select></label>
        <label style={{flex:"1 1 180px"}}>Business line<select value={line} onChange={e=>setLine(e.target.value)}><option value="all">All business lines</option><option value="eucalyptus">Eucalyptus</option><option value="beekeeping">Beekeeping</option><option value="infrastructure">Infrastructure</option><option value="other">Other</option></select></label>
        <label style={{flex:"2 1 240px"}}>Search proposal or finding<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Proposal code, ID, discrepancy…" /></label>
      </div></div>
      <div className="panel"><h2>Proposal discrepancies</h2>{rows.length===0?<p className="muted">No proposals match these filters.</p>:<div style={{overflowX:"auto"}}><table><thead><tr><th>Proposal</th><th>Business line</th><th>Approved</th><th>Gross originals</th><th>Reversals</th><th>Net spend</th><th>Counter variance</th><th>Findings</th><th>Details</th></tr></thead><tbody>
        {rows.map(p=><tr key={p.proposalId}><td><strong>{p.proposalCode || p.proposalId}</strong><div className="muted" style={{fontSize:12}}>{p.status || "—"}</div></td><td>{p.businessLine || "—"}</td><td>{money(p.approvedAmountUgx)}</td><td>{money(p.grossOriginalVerifiedSpendUgx)}</td><td>{money(p.validReversalTotalUgx)}</td><td>{money(p.netSpendUgx)}</td><td>{money(p.counterVarianceUgx)}</td><td>{p.findings.length}</td><td><button className="btn" onClick={()=>setSelected(selected===p.proposalId?null:p.proposalId)}>{selected===p.proposalId?"Hide":"Inspect"}</button></td></tr>)}
      </tbody></table></div>}</div>
      {rows.filter(p=>p.proposalId===selected).map(p=><div className="panel" key={p.proposalId}><h2>Findings — {p.proposalCode || p.proposalId}</h2><p><strong>Remaining approved capital:</strong> {money(p.remainingApprovedAmountUgx)}</p>{p.findings.length===0?<p className="muted">No discrepancies recorded for this proposal in the current scan.</p>:p.findings.map((f,i)=><div className="card" key={`${f.code}-${i}`}><div className="row"><strong>{f.severity.toUpperCase()}</strong><code>{f.code}</code></div><p>{f.message}</p>{f.spendRecordId&&<p className="muted">Spend record: {f.spendRecordId}</p>}{f.relatedSpendRecordId&&<p className="muted">Related record: {f.relatedSpendRecordId}</p>}</div>)}</div>)}
      <div className="card"><strong>Important:</strong> This screen does not change financial records, approve corrections, or execute payments. A discrepancy is a signal to investigate, not proof of fraud or an instruction to change records.</div>
    </>}
  </main></div>;
}
