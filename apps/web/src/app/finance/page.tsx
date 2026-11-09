'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';
import {
  MetricCard,
  Segmented,
  Badge,
  FormSection,
  CollapsibleSection,
  NoticeBanner,
  Callout,
  thLeft,
  thRight,
  tdLeft,
  tdRight,
  tableStyle,
  theadRow,
  bodyRow,
  footerRow,
  mono,
} from '@/components/ui';

type Tx = {
  _id: string;
  transactionId: string;
  organizationId: string;
  createdBy: string;
  date: string;
  direction: 'Income' | 'Expense' | 'Transfer';
  businessLine: 'Forestry' | 'Beekeeping' | 'Shared/Admin';
  category: string;
  description: string;
  amountUgx: number;
  paymentMethod: string;
  counterparty?: string;
  receiptReference?: string;
  reconciled: boolean;
  notes?: string;
};

type FormState = {
  transactionId: string;
  date: string;
  direction: 'Income' | 'Expense' | 'Transfer';
  businessLine: 'Forestry' | 'Beekeeping' | 'Shared/Admin';
  category: string;
  description: string;
  amountUgx: string;
  paymentMethod: 'Cash' | 'Mobile money' | 'Bank' | 'Other';
  counterparty: string;
  receiptReference: string;
  notes: string;
};

type EditState = {
  amountUgx: string;
  category: string;
  description: string;
  reconciled: boolean;
};

type SortKey = 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc';

const DIRECTION_OPTIONS = ['Income', 'Expense', 'Transfer'] as const;
const BUSINESS_OPTIONS = ['Forestry', 'Beekeeping', 'Shared/Admin'] as const;
const PAYMENT_OPTIONS = ['Cash', 'Mobile money', 'Bank', 'Other'] as const;

const blank = (): FormState => ({
  transactionId: '',
  date: new Date().toISOString().slice(0, 10),
  direction: 'Expense',
  businessLine: 'Forestry',
  category: '',
  description: '',
  amountUgx: '',
  paymentMethod: 'Cash',
  counterparty: '',
  receiptReference: '',
  notes: '',
});

export default function Finance() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Income' | 'Expense' | 'Transfer'>('all');
  const [lineFilter, setLineFilter] = useState<'all' | 'Forestry' | 'Beekeeping' | 'Shared/Admin'>('all');
  const [sort, setSort] = useState<SortKey>('dateDesc');
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ amountUgx: '', category: '', description: '', reconciled: false });

  async function load() {
    try {
      setRows(await getData<Tx[]>('/finance'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API unavailable');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await postData('/finance', {
        transactionId: form.transactionId.trim(),
        date: form.date,
        direction: form.direction,
        businessLine: form.businessLine,
        category: form.category.trim(),
        description: form.description.trim(),
        amountUgx: Number(form.amountUgx),
        paymentMethod: form.paymentMethod,
        counterparty: form.counterparty.trim() || undefined,
        receiptReference: form.receiptReference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setNotice('Transaction recorded.');
      setForm(blank());
      setFormOpen(false);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(x: Tx) {
    setEditing(x._id);
    setEditState({
      amountUgx: String(x.amountUgx ?? 0),
      category: x.category ?? '',
      description: x.description ?? '',
      reconciled: x.reconciled ?? false,
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditState({ amountUgx: '', category: '', description: '', reconciled: false });
  }

  async function saveEdit(id: string) {
    try {
      await patchData(`/finance/${id}`, {
        amountUgx: Number(editState.amountUgx),
        category: editState.category.trim(),
        description: editState.description.trim(),
        reconciled: editState.reconciled,
      });
      setNotice('Transaction updated.');
      cancelEdit();
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const income = rows.filter(x => x.direction === 'Income').reduce((s, x) => s + (x.amountUgx ?? 0), 0);
  const expenses = rows.filter(x => x.direction === 'Expense').reduce((s, x) => s + (x.amountUgx ?? 0), 0);
  const transfers = rows.filter(x => x.direction === 'Transfer').reduce((s, x) => s + (x.amountUgx ?? 0), 0);
  const net = income - expenses;
  const reconciledCount = rows.filter(x => x.reconciled).length;
  const unReconciled = rows.length - reconciledCount;

  const filtered = rows.filter(x => {
    if (filter !== 'all' && x.direction !== filter) return false;
    if (lineFilter !== 'all' && x.businessLine !== lineFilter) return false;
    return true;
  });

  const visibleRows = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'dateAsc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amountDesc':
        return b.amountUgx - a.amountUgx;
      case 'amountAsc':
        return a.amountUgx - b.amountUgx;
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/plantations', 'Plantations'],
            ['/apiary', 'Apiary'],
            ['/finance', 'Finance'],
            ['/sales', 'Sales'],
            ['/inventory', 'Inventory'],
            ['/tasks', 'Tasks'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Finance</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Transaction register · business operations · UGX
        </p>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MetricCard
            label="Income"
            value={`${income.toLocaleString()} UGX`}
            detail={`${rows.filter(r => r.direction === 'Income').length} transactions`}
            tone={income > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            label="Expenses"
            value={`${expenses.toLocaleString()} UGX`}
            detail={`${rows.filter(r => r.direction === 'Expense').length} transactions`}
            tone={expenses > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Net"
            value={`${net.toLocaleString()} UGX`}
            detail={net >= 0 ? 'Income above expenses' : 'Expenses above income'}
            tone={net >= 0 ? 'success' : 'danger'}
          />
          <MetricCard
            label="Un-reconciled"
            value={String(unReconciled)}
            detail={unReconciled > 0 ? 'Needs review' : 'All reconciled'}
            tone={unReconciled > 0 ? 'warn' : 'success'}
          />
        </div>

        <CollapsibleSection
          title="Record transaction"
          open={formOpen}
          onToggle={() => setFormOpen(o => !o)}
          actionLabel="+ New transaction"
        >
          <form onSubmit={save}>
            <FormSection title="Identification">
              <label>
                Transaction ID *
                <input value={form.transactionId} onChange={e => update('transactionId', e.target.value)} placeholder="T-0001" required />
              </label>
              <label>
                Date *
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
              </label>
              <label>
                Direction *
                <select value={form.direction} onChange={e => update('direction', e.target.value as FormState['direction'])}>
                  {DIRECTION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label>
                Business line *
                <select value={form.businessLine} onChange={e => update('businessLine', e.target.value as FormState['businessLine'])}>
                  {BUSINESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Categorisation">
              <label>
                Category *
                <input value={form.category} onChange={e => update('category', e.target.value)} placeholder="Plantation maintenance" required />
              </label>
              <label>
                Payment method
                <select value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value as FormState['paymentMethod'])}>
                  {PAYMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Details">
              <label>
                Amount (UGX) *
                <input type="number" min={0} value={form.amountUgx} onChange={e => update('amountUgx', e.target.value)} placeholder="250000" required />
              </label>
              <label>
                Description *
                <input value={form.description} onChange={e => update('description', e.target.value)} placeholder="Weeding round 3 - BLK-001" required />
              </label>
              <label>
                Counterparty
                <input value={form.counterparty} onChange={e => update('counterparty', e.target.value)} placeholder="Field crew" />
              </label>
              <label>
                Receipt reference
                <input value={form.receiptReference} onChange={e => update('receiptReference', e.target.value)} placeholder="RCPT-001" />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Notes
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save transaction'}</button>
              <button className="btn" type="button" onClick={() => { setFormOpen(false); setError(''); }} disabled={busy}>Cancel</button>
            </div>
          </form>
        </CollapsibleSection>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <Segmented
            options={[
              { key: 'all', label: `All (${rows.length})` },
              { key: 'Income', label: `Income (${rows.filter(r => r.direction === 'Income').length})` },
              { key: 'Expense', label: `Expense (${rows.filter(r => r.direction === 'Expense').length})` },
              { key: 'Transfer', label: `Transfer (${rows.filter(r => r.direction === 'Transfer').length})` },
            ]}
            value={filter}
            onChange={k => setFilter(k as typeof filter)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Business line</span>
            <select value={lineFilter} onChange={e => setLineFilter(e.target.value as typeof lineFilter)} style={{ width: 'auto' }}>
              <option value="all">All</option>
              {BUSINESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Sort by</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ width: 'auto' }}>
              <option value="dateDesc">Newest first</option>
              <option value="dateAsc">Oldest first</option>
              <option value="amountDesc">Highest amount</option>
              <option value="amountAsc">Lowest amount</option>
            </select>
          </label>
        </div>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Transactions</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleRows.length} {visibleRows.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter !== 'all' || lineFilter !== 'all'
                ? 'No transactions match the current filters.'
                : 'No transactions yet. Click + New transaction to record the first one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Date</th>
                    <th style={thLeft}>ID</th>
                    <th style={thLeft}>Direction</th>
                    <th style={thLeft}>Business line</th>
                    <th style={thLeft}>Category</th>
                    <th style={thLeft}>Description</th>
                    <th style={thLeft}>Payment</th>
                    <th style={thRight}>Amount (UGX)</th>
                    <th style={thLeft}>Reconciled</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(x => {
                    const isEditing = editing === x._id;
                    return (
                      <tr key={x._id} style={bodyRow} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <td style={tdLeft}>{x.date?.slice(0, 10)}</td>
                        <td style={{ ...tdLeft, ...mono }}>{x.transactionId}</td>
                        <td style={tdLeft}>
                          <Badge
                            label={x.direction}
                            tone={x.direction === 'Income' ? 'ok' : x.direction === 'Expense' ? 'danger' : 'info'}
                          />
                        </td>
                        <td style={tdLeft}>{x.businessLine}</td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <input value={editState.category} onChange={e => setEditState({ ...editState, category: e.target.value })} style={{ width: 140 }} />
                          ) : x.category}
                        </td>
                        <td style={{ ...tdLeft, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isEditing ? (
                            <input value={editState.description} onChange={e => setEditState({ ...editState, description: e.target.value })} style={{ width: 220 }} />
                          ) : x.description}
                        </td>
                        <td style={tdLeft}>{x.paymentMethod}</td>
                        <td style={{ ...tdRight, fontWeight: 600, color: x.direction === 'Income' ? '#15803d' : x.direction === 'Expense' ? '#b91c1c' : undefined }}>
                          {isEditing ? (
                            <input type="number" min={0} value={editState.amountUgx} onChange={e => setEditState({ ...editState, amountUgx: e.target.value })} style={{ width: 100, textAlign: 'right' }} />
                          ) : x.amountUgx.toLocaleString()}
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                              <input type="checkbox" checked={editState.reconciled} onChange={e => setEditState({ ...editState, reconciled: e.target.checked })} />
                              <span style={{ fontSize: 13 }}>Done</span>
                            </label>
                          ) : x.reconciled ? (
                            <Badge label="✓ Reconciled" tone="ok" />
                          ) : (
                            <Badge label="Pending" tone="warn" />
                          )}
                        </td>
                        <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <>
                              <button className="btn" onClick={() => void saveEdit(x._id)} style={{ marginRight: 6 }}>Save</button>
                              <button className="btn" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn" onClick={() => startEdit(x)}>Edit</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={footerRow}>
                    <td style={tdLeft} colSpan={7}>Totals ({visibleRows.length} shown)</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + x.amountUgx, 0).toLocaleString()}</td>
                    <td style={tdLeft} colSpan={2}>—</td>
                  </tr>
                  <tr>
                    <td style={tdLeft} colSpan={10} className="muted">
                      Income: {visibleRows.filter(r => r.direction === 'Income').reduce((s, r) => s + r.amountUgx, 0).toLocaleString()} UGX ·
                      Expenses: {visibleRows.filter(r => r.direction === 'Expense').reduce((s, r) => s + r.amountUgx, 0).toLocaleString()} UGX ·
                      Transfers: {visibleRows.filter(r => r.direction === 'Transfer').reduce((s, r) => s + r.amountUgx, 0).toLocaleString()} UGX
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <Callout title="Reconciliation discipline">
          Reconciliation status is not automated. Mark transactions as reconciled after manual review of the receipt and ledger. Transactions marked pending should be reviewed before month close.
        </Callout>
      </main>
    </div>
  );
}