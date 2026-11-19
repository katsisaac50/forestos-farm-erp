'use client';
import { useEffect, useState } from 'react';
import { getData } from '@/lib/api';

type Row = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalSide: 'debit' | 'credit';
  debit: number;
  credit: number;
  net: number;
  netForDisplay: number;
};

type Report = {
  organizationId: string;
  from: string | null;
  to: string | null;
  generatedAt: string;
  rows: Row[];
  totals: { debit: number; credit: number; difference: number };
  balanced: boolean;
};

export default function TrialBalancePage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const suffix = qs.toString() ? '?' + qs.toString() : '';
      setReport(await getData<Report>('/accounting/trial-balance' + suffix));
    } catch (e: any) {
      setError(e?.message || 'Could not load trial balance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (n: number) =>
    new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(n) + ' UGX';

  return (
    <>
      <h1>Trial balance</h1>
      <p className="muted">All posted journal lines grouped by account. The GL is balanced when total debits equal total credits.</p>

      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label>From date<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>To date<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {report && (
        <>
          <div
            className="panel"
            style={{
              borderLeft: `4px solid ${report.balanced ? '#16a34a' : '#dc2626'}`,
              backgroundColor: report.balanced ? '#f0fdf4' : '#fef2f2',
            }}
          >
            <h2 style={{ margin: 0 }}>
              {report.balanced ? '✓ Balanced' : '✗ Out of balance'}
            </h2>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Total debits: <b>{money(report.totals.debit)}</b> · Total credits: <b>{money(report.totals.credit)}</b>
              {!report.balanced && <> · Difference: <b style={{ color: '#dc2626' }}>{money(report.totals.difference)}</b></>}
            </p>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              Generated {new Date(report.generatedAt).toLocaleString()} · {report.rows.length} accounts with activity
            </p>
          </div>

          <section className="panel">
            <h2>Account detail</h2>
            {report.rows.length === 0 ? (
              <p className="muted">No posted journal lines yet. Create a finance transaction or run backfill first.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                      <th style={{ textAlign: 'right' }}>Net (normal side)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map(r => (
                      <tr key={r.accountId}>
                        <td><code>{r.accountCode}</code></td>
                        <td>{r.accountName}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.accountType}</td>
                        <td style={{ textAlign: 'right' }}>{r.debit > 0 ? money(r.debit) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{r.credit > 0 ? money(r.credit) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(r.netForDisplay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}