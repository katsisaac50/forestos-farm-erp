 "use client";
import React, {useCallback, useEffect, useState} from "react";
import {getData} from "@/lib/api";

type AnyRecord = Record<string, any>;
const apiBase = "/case-evidence/recovery-escalations";
function csvCell(v: unknown) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}
export default function RecoveryGovernancePage() {
  const [health, setHealth] = useState<AnyRecord | null>(null);
  const [status, setStatus] = useState<AnyRecord | null>(null);
  const [summary, setSummary] = useState<AnyRecord | null>(null);
  const [events, setEvents] = useState<AnyRecord[]>([]);
  const [filter, setFilter] = useState("all");
  const [incidentCode, setIncidentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [h, s, a, e] = await Promise.all([
        getData(`${apiBase}/provider-health`),
        getData(`${apiBase}/delivery-status`),
        getData(`${apiBase}/audit-summary`),
        getData(`${apiBase}/events?limit=500${filter !== "all" ? `&status=${encodeURIComponent(filter)}` : ""}${incidentCode.trim() ? `&incidentCode=${encodeURIComponent(incidentCode.trim())}` : ""}`)
      ]);
      setHealth(h as AnyRecord); setStatus(s as AnyRecord); setSummary(a as AnyRecord);
      const raw = e as any;
      setEvents(Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.events) ? raw.events : []);
    } catch (e: any) { setError(e?.message || "Unable to load notification governance data."); }
    finally { setBusy(false); }
  }, [filter, incidentCode]);
  useEffect(() => { void load(); }, [load]);
  const exportCsv = () => {
    const columns = ["createdAt","incidentCode","alertType","recipient","channel","deliveryStatus","attemptCount","lastError","lastReplayReason","lastReplayedBy","lastReplayedAt","dedupeKey"];
    const lines = [columns.map(csvCell).join(","), ...events.map(e => columns.map(k => csvCell(e[k] ?? e[(k === "createdAt" ? "evaluatedAt" : k)])).join(","))];
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `forestos-notification-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const counts = status?.counts || health?.counts || {};
  const metric = (label: string, value: unknown) => <div key={label} className="rounded-xl border p-4"><div className="text-sm opacity-70">{label}</div><div className="mt-1 text-2xl font-semibold">{String(value ?? "—")}</div></div>;
  return <main className="mx-auto max-w-7xl space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-semibold uppercase tracking-wide opacity-60">ForestOS · Phase 82</p><h1 className="text-3xl font-bold">Notification Governance & Reliability</h1><p className="mt-2 max-w-3xl opacity-75">Operational snapshot of provider configuration, queue health, and the recent notification audit trail.</p></div>
      <div className="flex gap-2"><button className="rounded-lg border px-4 py-2" onClick={exportCsv} disabled={!events.length}>Export visible CSV</button><button className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" onClick={() => void load()} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button></div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-400 p-3 text-red-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metric("Queued", counts.queued)}{metric("Failed", counts.failed)}{metric("Provider accepted", counts.sent)}{metric("Internal-only logs", counts.loggedOnly)}
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-5"><h2 className="text-xl font-semibold">Provider health</h2><div className="mt-3 flex items-center gap-3"><span className="rounded-full border px-3 py-1 text-sm">{health?.health || (status?.configured ? "configured" : "not configured")}</span><span className="text-sm opacity-70">{health?.provider || status?.provider || "unknown provider"}</span></div><dl className="mt-4 space-y-2 text-sm"><div><dt className="inline font-medium">Configured: </dt><dd className="inline">{String(health?.configured ?? status?.configured ?? "unknown")}</dd></div><div><dt className="inline font-medium">Endpoint host: </dt><dd className="inline">{health?.host || "not exposed / not configured"}</dd></div><div><dt className="inline font-medium">Max attempts: </dt><dd className="inline">{health?.maxAttempts ?? status?.maxAttempts ?? "—"}</dd></div><div><dt className="inline font-medium">Last provider failure: </dt><dd className="inline">{health?.lastFailure?.at ? new Date(health.lastFailure.at).toLocaleString() : "none reported"}</dd></div></dl>{health?.configurationError && <p className="mt-3 rounded-lg border p-3 text-sm">{health.configurationError}</p>}</div>
      <div className="rounded-xl border p-5"><h2 className="text-xl font-semibold">Audit summary</h2><p className="mt-1 text-sm opacity-70">Summary from the API's stored notification events.</p><pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">{JSON.stringify(summary, null, 2)}</pre></div>
    </section>
    <section className="rounded-xl border p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Notification audit trail</h2><p className="text-sm opacity-70">Up to 500 records returned by the API.</p></div><div className="flex flex-wrap gap-2"><label className="text-sm">Status<select className="ml-2 rounded-lg border p-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All</option><option value="queued">Queued</option><option value="failed">Failed</option><option value="sent">Provider accepted</option><option value="suppressed">Suppressed</option><option value="logged_only">Internal only</option></select></label><label className="text-sm">Incident<input className="ml-2 rounded-lg border p-2" value={incidentCode} onChange={e=>setIncidentCode(e.target.value)} placeholder="Incident code"/></label></div></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Created / evaluated</th><th className="p-2">Incident</th><th className="p-2">Alert</th><th className="p-2">Recipient</th><th className="p-2">Status</th><th className="p-2">Attempts</th><th className="p-2">Last error</th></tr></thead><tbody>{events.map((e,i)=><tr key={e._id || e.id || i} className="border-b align-top"><td className="p-2">{e.createdAt || e.evaluatedAt ? new Date(e.createdAt || e.evaluatedAt).toLocaleString() : "—"}</td><td className="p-2">{e.incidentCode || "—"}</td><td className="p-2">{e.alertType || "—"}</td><td className="p-2">{e.recipient || "—"}</td><td className="p-2">{e.deliveryStatus || "—"}</td><td className="p-2">{e.attemptCount ?? 0}</td><td className="max-w-xs break-words p-2">{e.lastError || "—"}</td></tr>)}</tbody></table>{!events.length && <p className="p-5 text-center opacity-70">No records returned for the current filters.</p>}</div>
    </section>
    <p className="text-xs opacity-70">Reliability note: “Provider accepted” means the configured endpoint returned HTTP 2xx. It does not prove that a person received, opened, or read a notification. CSV export contains only the records currently loaded in this view.</p>
  </main>;
}
