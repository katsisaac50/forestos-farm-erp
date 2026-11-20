'use client';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';

type Period = {
  _id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  closedAt?: string;
  closedBy?: string;
  reopenReason?: string;
  journalEntryCount: number;
  postedCount: number;
  unpostedCount: number;
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));

  async function load() {
    setLoading(true);
    setError('');
    try {
      setPeriods(await getData<Period[]>('/accounting/periods'));
    } catch (e: any) {
      setError(e?.message || 'Could not load periods');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function lockPeriod() {
    if (!confirm(`Lock period ${newYear}-${String(newMonth).padStart(2, '0')}? No new postings will be allowed in that month.`)) return;
    try {
      await postData(`/accounting/periods/${newYear}/${newMonth}/lock`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not lock period');
    }
  }

  async function reopenPeriod(p: Period) {
    const reason = window.prompt(`Reopen ${p.periodStart} – ${p.periodEnd}?\n\nReason (10+ chars, recorded permanently):`);
    if (!reason || reason.trim().length < 10) {
      setError('Reopen reason must be at least 10 characters.');
      return;
    }
    try {
      await postData(`/accounting/periods/${p._id}/reopen`, { reason: reason.trim() });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not reopen period');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Accounting periods</h1>
        <p className="text-sm text-gray-600">
          Once a period is locked, no new journal entries can be posted into it. Reopening requires a written reason and is recorded for audit.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <label className="text-sm">Year
          <input type="number" value={newYear} onChange={e => setNewYear(e.target.value)} className="ml-2 w-24 rounded border p-2" />
        </label>
        <label className="text-sm">Month
          <select value={newMonth} onChange={e => setNewMonth(e.target.value)} className="ml-2 rounded border p-2">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
        </label>
        <button onClick={lockPeriod} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
          Lock period
        </button>
        <button onClick={load} disabled={loading} className="rounded-lg border px-4 py-2">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-400 bg-red-50 p-3 text-red-800">{error}</div>}

      <section className="rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">Period</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Entries</th>
              <th className="p-3 text-right">Unposted</th>
              <th className="p-3 text-left">Closed by</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No periods yet. Lock a month above to create one.</td></tr>
            ) : (
              periods.map(p => (
                <tr key={p._id} className="border-b">
                  <td className="p-3"><strong>{p.periodStart}</strong> → {p.periodEnd}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      p.locked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {p.locked ? 'Locked' : 'Open'}
                    </span>
                  </td>
                  <td className="p-3 text-right">{p.journalEntryCount}</td>
                  <td className="p-3 text-right">
                    {p.unpostedCount > 0 ? <span className="text-red-700 font-semibold">{p.unpostedCount}</span> : '—'}
                  </td>
                  <td className="p-3 text-xs">
                    {p.lockedBy && p.lockedAt ? (
                      <>{p.lockedBy}<br/><span className="text-gray-500">{new Date(p.lockedAt).toLocaleString()}</span></>
                    ) : '—'}
                  </td>
                  <td className="p-3">
                    {p.locked && (
                      <button onClick={() => reopenPeriod(p)} className="rounded border px-3 py-1 text-xs">
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}