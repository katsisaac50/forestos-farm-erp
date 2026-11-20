'use client';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';

type ListItem = {
  _id: string;
  journalNumber: string;
  date: string;
  description: string;
  sourceType: string;
  sourceId: string;
  posted: boolean;
  voided: boolean;
  reversalOf?: string;
  reversedBy?: string;
  createdAt: string;
  totalAmount: number;
  lineCount: number;
};

type Detail = ListItem & {
  lines: Array<{
    _id: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
    businessLine?: string;
  }>;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' UGX';

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<ListItem[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [
      { accountCode: '', debit: '', credit: '', memo: '' },
      { accountCode: '', debit: '', credit: '', memo: '' },
    ],
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      setEntries(await getData<ListItem[]>('/accounting/journal-entries'));
    } catch (e: any) {
      setError(e?.message || 'Could not load journals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function openDetail(id: string) {
    try {
      setSelected(await getData<Detail>(`/accounting/journal-entries/${id}`));
    } catch (e: any) {
      setError(e?.message || 'Could not load details');
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const body = {
        date: form.date,
        description: form.description,
        lines: form.lines.map(l => ({
          accountCode: l.accountCode,
          debit: l.debit ? Number(l.debit) : 0,
          credit: l.credit ? Number(l.credit) : 0,
          memo: l.memo || undefined,
        })),
      };
      const created = await postData<Detail>('/accounting/journal-entries', body);
      setSelected(created);
      setFormOpen(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        lines: [
          { accountCode: '', debit: '', credit: '', memo: '' },
          { accountCode: '', debit: '', credit: '', memo: '' },
        ],
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not post entry');
    }
  }

  async function reverseEntry() {
    if (!selected) return;
    const reason = window.prompt('Reason for reversing this entry? (10+ chars, recorded permanently)');
    if (!reason || reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    try {
      const reversal = await postData<Detail>(`/accounting/journal-entries/${selected._id}/reverse`, {
        reason: reason.trim(),
      });
      setSelected(reversal);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not reverse entry');
    }
  }

  function updateLine(i: number, key: 'accountCode' | 'debit' | 'credit' | 'memo', value: string) {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, idx) => idx === i ? { ...l, [key]: value } : l),
    }));
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, { accountCode: '', debit: '', credit: '', memo: '' }] }));
  }

  function removeLine(i: number) {
    if (form.lines.length <= 2) return;
    setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  }

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold">Journal entries</h1>
          <p className="text-sm text-gray-600">Every posted journal in the general ledger. Manual entries and reversals appear here alongside operational postings.</p>
        </div>
        <button onClick={() => setFormOpen(v => !v)} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
          {formOpen ? 'Cancel' : '+ Manual entry'}
        </button>
      </header>

      {error && <div className="rounded-lg border border-red-400 bg-red-50 p-3 text-red-800">{error}</div>}

      {formOpen && (
        <form onSubmit={submitManual} className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-bold">New manual journal entry</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Date
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="text-sm">Description
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required minLength={3} placeholder="Opening balance adjustment" className="mt-1 w-full rounded border p-2" />
            </label>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600">
              <div className="col-span-3">Account code</div>
              <div className="col-span-3">Debit</div>
              <div className="col-span-3">Credit</div>
              <div className="col-span-2">Memo</div>
              <div className="col-span-1" />
            </div>
            {form.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={l.accountCode} onChange={e => updateLine(i, 'accountCode', e.target.value)} placeholder="1000" required className="col-span-3 rounded border p-2 text-sm" />
                <input type="number" min="0" step="any" value={l.debit} onChange={e => updateLine(i, 'debit', e.target.value)} className="col-span-3 rounded border p-2 text-sm" placeholder="0" />
                <input type="number" min="0" step="any" value={l.credit} onChange={e => updateLine(i, 'credit', e.target.value)} className="col-span-3 rounded border p-2 text-sm" placeholder="0" />
                <input value={l.memo} onChange={e => updateLine(i, 'memo', e.target.value)} className="col-span-2 rounded border p-2 text-sm" placeholder="optional" />
                <button type="button" onClick={() => removeLine(i)} disabled={form.lines.length <= 2} className="col-span-1 rounded border px-2 py-1 text-xs disabled:opacity-30">✕</button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="rounded border px-3 py-1 text-xs">+ Add line</button>
          </div>
          <div className="flex justify-between items-center border-t pt-3 text-sm">
            <div>
              <span className="font-semibold">Debit: </span>{money(totalDebit)} · <span className="font-semibold">Credit: </span>{money(totalCredit)}
              {!balanced && <span className="ml-2 text-red-700 font-semibold">(not balanced)</span>}
            </div>
            <button disabled={!balanced} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40">
              Post entry
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3 text-left">Number</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No journal entries yet.</td></tr>
              ) : (
                entries.map(e => (
                  <tr key={e._id} onClick={() => openDetail(e._id)} className="cursor-pointer border-b hover:bg-gray-50">
                    <td className="p-2 text-xs"><code>{e.journalNumber}</code></td>
                    <td className="p-2 text-xs">{e.date}</td>
                    <td className="p-2">{e.description}</td>
                    <td className="p-2 text-right font-medium">{money(e.totalAmount)}</td>
                    <td className="p-2 text-xs">
                      {e.voided ? <span className="text-red-700">Voided</span> :
                       e.reversedBy ? <span className="text-orange-700">Reversed</span> :
                       e.reversalOf ? <span className="text-blue-700">Reversal</span> :
                       <span className="text-emerald-700">Posted</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border bg-white p-5">
          {!selected ? (
            <p className="text-gray-500 text-center py-12">Select a journal entry to view its lines.</p>
          ) : (
            <>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-lg font-bold"><code>{selected.journalNumber}</code></h2>
                  <p className="text-sm text-gray-600">{selected.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selected.date} · source: {selected.sourceType}
                    {selected.reversalOf && ` · reverses ${selected.reversalOf}`}
                    {selected.reversedBy && ` · reversed by ${selected.reversedBy}`}
                  </p>
                </div>
                {selected.posted && !selected.reversedBy && !selected.voided && (
                  <button onClick={reverseEntry} className="rounded border border-orange-400 px-3 py-1 text-xs text-orange-700 hover:bg-orange-50">
                    Reverse
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map(l => (
                    <tr key={l._id} className="border-b">
                      <td className="p-2">
                        <code className="text-xs text-gray-500">{l.accountCode}</code>
                        <div>{l.accountName}</div>
                        {l.memo && <div className="text-xs text-gray-500">{l.memo}</div>}
                      </td>
                      <td className="p-2 text-right">{l.debit > 0 ? money(l.debit) : '—'}</td>
                      <td className="p-2 text-right">{l.credit > 0 ? money(l.credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-50">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{money(selected.lines.reduce((s, l) => s + l.debit, 0))}</td>
                    <td className="p-2 text-right">{money(selected.lines.reduce((s, l) => s + l.credit, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </div>
  );
}