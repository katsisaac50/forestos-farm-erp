'use client';
import { useEffect, useState } from 'react';
import { getData } from '@/lib/api';

type ReportLine = {
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
};

type PL = {
  from: string; to: string; generatedAt: string;
  revenue: ReportLine[]; revenueTotal: number;
  cogs: ReportLine[]; cogsTotal: number;
  grossProfit: number;
  expenses: ReportLine[]; expensesTotal: number;
  netIncome: number;
};

type BS = {
  asOf: string; generatedAt: string;
  assets: ReportLine[]; assetsTotal: number;
  liabilities: ReportLine[]; liabilitiesTotal: number;
  equity: ReportLine[]; equityTotal: number;
  retainedEarnings: number;
  balanced: boolean;
  difference: number;
};

type CF = {
  from: string; to: string; generatedAt: string;
  openingCash: number; closingCash: number; netChange: number;
  inflows: Array<{ date: string; description: string; amount: number; journalNumber: string }>;
  outflows: Array<{ date: string; description: string; amount: number; journalNumber: string }>;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' UGX';

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function AccountingReportsPage() {
  const [tab, setTab] = useState<'pl' | 'bs' | 'cf'>('pl');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [asOf, setAsOf] = useState(today);
  const [pl, setPl] = useState<PL | null>(null);
  const [bs, setBs] = useState<BS | null>(null);
  const [cf, setCf] = useState<CF | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (tab === 'pl') setPl(await getData<PL>(`/accounting/reports/profit-and-loss?from=${from}&to=${to}`));
      if (tab === 'bs') setBs(await getData<BS>(`/accounting/reports/balance-sheet?asOf=${asOf}`));
      if (tab === 'cf') setCf(await getData<CF>(`/accounting/reports/cash-flow?from=${from}&to=${to}`));
    } catch (e: any) {
      setError(e?.message || 'Could not load report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [tab, from, to, asOf]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Financial reports</h1>
        <p className="text-sm text-gray-600">All values from the posted general ledger. Trial balance must show balanced before relying on these.</p>
      </header>

      <nav className="flex gap-1 border-b">
        {[
          ['pl', 'Profit & Loss'],
          ['bs', 'Balance Sheet'],
          ['cf', 'Cash Flow'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border p-4 bg-white">
        {tab === 'bs' ? (
          <label className="text-sm">As of<input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="ml-2 rounded border p-2" /></label>
        ) : (
          <>
            <label className="text-sm">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="ml-2 rounded border p-2" /></label>
            <label className="text-sm">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="ml-2 rounded border p-2" /></label>
          </>
        )}
        <button onClick={load} disabled={loading} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-400 bg-red-50 p-3 text-red-800">{error}</div>}

      {tab === 'pl' && pl && <PLView r={pl} />}
      {tab === 'bs' && bs && <BSView r={bs} />}
      {tab === 'cf' && cf && <CFView r={cf} />}
    </div>
  );
}

function LineTable({ lines, empty = 'No activity' }: { lines: ReportLine[]; empty?: string }) {
  if (!lines.length) return <p className="text-sm text-gray-500 py-2">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map(l => (
          <tr key={l.accountCode} className="border-b">
            <td className="py-1"><code className="text-xs text-gray-500">{l.accountCode}</code></td>
            <td>{l.accountName}</td>
            <td className="text-right font-medium">{money(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PLView({ r }: { r: PL }) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="text-lg font-bold">Profit & Loss</h2>
      <p className="text-xs text-gray-500">{r.from.slice(0, 10)} → {r.to.slice(0, 10)} · generated {new Date(r.generatedAt).toLocaleString()}</p>

      <section>
        <h3 className="font-semibold text-gray-700">Revenue</h3>
        <LineTable lines={r.revenue} />
        <div className="text-right font-semibold pt-1">Total revenue: {money(r.revenueTotal)}</div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-700">Cost of Goods Sold</h3>
        <LineTable lines={r.cogs} />
        <div className="text-right font-semibold pt-1">Total COGS: {money(r.cogsTotal)}</div>
      </section>

      <div className="text-right font-bold text-lg border-t pt-2">Gross profit: {money(r.grossProfit)}</div>

      <section>
        <h3 className="font-semibold text-gray-700">Operating Expenses</h3>
        <LineTable lines={r.expenses} />
        <div className="text-right font-semibold pt-1">Total expenses: {money(r.expensesTotal)}</div>
      </section>

      <div className={`text-right font-bold text-xl border-t pt-2 ${r.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
        Net income: {money(r.netIncome)}
      </div>
    </div>
  );
}

function BSView({ r }: { r: BS }) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <div className={`rounded-lg p-3 ${r.balanced ? 'bg-emerald-50 border border-emerald-300' : 'bg-red-50 border border-red-300'}`}>
        <strong>{r.balanced ? '✓ Balanced' : '✗ Out of balance'}</strong>
        {!r.balanced && <> — difference {money(r.difference)}</>}
      </div>

      <h2 className="text-lg font-bold">Balance Sheet</h2>
      <p className="text-xs text-gray-500">As of {r.asOf.slice(0, 10)} · generated {new Date(r.generatedAt).toLocaleString()}</p>

      <section>
        <h3 className="font-semibold text-gray-700">Assets</h3>
        <LineTable lines={r.assets} />
        <div className="text-right font-semibold pt-1">Total assets: {money(r.assetsTotal)}</div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-700">Liabilities</h3>
        <LineTable lines={r.liabilities} />
        <div className="text-right font-semibold pt-1">Total liabilities: {money(r.liabilitiesTotal)}</div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-700">Equity</h3>
        <LineTable lines={r.equity} />
        <div className="py-1 flex justify-between border-t">
          <span>Retained earnings (cumulative net income)</span>
          <span className="font-medium">{money(r.retainedEarnings)}</span>
        </div>
        <div className="text-right font-semibold pt-1">Total equity: {money(r.equityTotal)}</div>
      </section>

      <div className="text-right font-bold text-lg border-t pt-2">
        Liabilities + Equity: {money(r.liabilitiesTotal + r.equityTotal)}
      </div>
    </div>
  );
}

function CFView({ r }: { r: CF }) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      <h2 className="text-lg font-bold">Cash Flow</h2>
      <p className="text-xs text-gray-500">{r.from.slice(0, 10)} → {r.to.slice(0, 10)} · generated {new Date(r.generatedAt).toLocaleString()}</p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border p-3"><div className="text-xs text-gray-500">Opening cash</div><div className="font-semibold">{money(r.openingCash)}</div></div>
        <div className="rounded border p-3"><div className="text-xs text-gray-500">Net change</div><div className={`font-semibold ${r.netChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(r.netChange)}</div></div>
        <div className="rounded border p-3"><div className="text-xs text-gray-500">Closing cash</div><div className="font-semibold">{money(r.closingCash)}</div></div>
      </div>

      <section>
        <h3 className="font-semibold text-gray-700">Inflows</h3>
        {r.inflows.length === 0 ? <p className="text-sm text-gray-500">None</p> :
          <table className="w-full text-sm">
            <tbody>{r.inflows.map((i, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-1 text-xs text-gray-500">{i.date}</td>
                <td>{i.description}</td>
                <td className="text-xs text-gray-500">{i.journalNumber}</td>
                <td className="text-right font-medium text-emerald-700">+{money(i.amount)}</td>
              </tr>
            ))}</tbody>
          </table>}
      </section>

      <section>
        <h3 className="font-semibold text-gray-700">Outflows</h3>
        {r.outflows.length === 0 ? <p className="text-sm text-gray-500">None</p> :
          <table className="w-full text-sm">
            <tbody>{r.outflows.map((i, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-1 text-xs text-gray-500">{i.date}</td>
                <td>{i.description}</td>
                <td className="text-xs text-gray-500">{i.journalNumber}</td>
                <td className="text-right font-medium text-red-700">−{money(i.amount)}</td>
              </tr>
            ))}</tbody>
          </table>}
      </section>
    </div>
  );
}