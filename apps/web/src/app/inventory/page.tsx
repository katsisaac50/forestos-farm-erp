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

type Item = {
  _id: string;
  itemId: string;
  name: string;
  category: string;
  unit: string;
  openingStock: number;
  received: number;
  used: number;
  reorderLevel: number;
  supplier?: string;
  storageLocation?: string;
  notes?: string;
};

type FormState = {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  openingStock: string;
  received: string;
  used: string;
  reorderLevel: string;
  supplier: string;
  storageLocation: string;
  notes: string;
};

type EditState = {
  received: string;
  used: string;
  reorderLevel: string;
};

type SortKey = 'name' | 'itemId' | 'stockAsc' | 'status';

const CATEGORIES = [
  'Beekeeping equipment',
  'Forestry tools',
  'PPE / safety',
  'Packaging',
  'Chemicals',
  'Fuel',
  'Other',
];
const UNITS = ['piece', 'kg', 'litre', 'metre', 'box', 'set'];

const blank = (): FormState => ({
  itemId: '',
  name: '',
  category: 'Beekeeping equipment',
  unit: 'piece',
  openingStock: '0',
  received: '0',
  used: '0',
  reorderLevel: '1',
  supplier: '',
  storageLocation: '',
  notes: '',
});

export default function Inventory() {
  const [rows, setRows] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'reorder' | 'out'>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    received: '',
    used: '',
    reorderLevel: '',
  });

  async function load() {
    try {
      setRows(await getData<Item[]>('/inventory'));
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
      await postData('/inventory', {
        itemId: form.itemId.trim(),
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        openingStock: Number(form.openingStock),
        received: Number(form.received),
        used: Number(form.used),
        reorderLevel: Number(form.reorderLevel),
        supplier: form.supplier.trim() || undefined,
        storageLocation: form.storageLocation.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setNotice('Stock item saved.');
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

  function startEdit(x: Item) {
    setEditing(x._id);
    setEditState({
      received: String(x.received ?? 0),
      used: String(x.used ?? 0),
      reorderLevel: String(x.reorderLevel ?? 0),
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditState({ received: '', used: '', reorderLevel: '' });
  }

  async function saveEdit(id: string) {
    try {
      await patchData(`/inventory/${id}`, {
        received: Number(editState.received),
        used: Number(editState.used),
        reorderLevel: Number(editState.reorderLevel),
      });
      setNotice('Item updated.');
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

  function currentStock(x: Item) {
    return (x.openingStock ?? 0) + (x.received ?? 0) - (x.used ?? 0);
  }

  function statusOf(x: Item): 'out' | 'reorder' | 'ok' {
    const cur = currentStock(x);
    if (cur <= 0) return 'out';
    if (cur <= x.reorderLevel) return 'reorder';
    return 'ok';
  }

  const reorderCount = rows.filter(x => statusOf(x) === 'reorder').length;
  const outCount = rows.filter(x => statusOf(x) === 'out').length;
  const totalUnits = rows.reduce((sum, x) => sum + Math.max(0, currentStock(x)), 0);
  const categoryCount = new Set(rows.map(r => r.category)).size;

  const filtered =
    filter === 'reorder'
      ? rows.filter(x => statusOf(x) === 'reorder')
      : filter === 'out'
      ? rows.filter(x => statusOf(x) === 'out')
      : rows;

  const visibleRows = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'itemId':
        return a.itemId.localeCompare(b.itemId);
      case 'stockAsc':
        return currentStock(a) - currentStock(b);
      case 'status': {
        const rank = { out: 0, reorder: 1, ok: 2 } as const;
        return rank[statusOf(a)] - rank[statusOf(b)];
      }
      default:
        return a.name.localeCompare(b.name);
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
        <h1>Inventory</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Stock register · business operations · UGX
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
          <MetricCard label="Stock items" value={String(rows.length)} detail={`${categoryCount} categories`} />
          <MetricCard label="Units in stock" value={totalUnits.toLocaleString()} detail="Sum across items" />
          <MetricCard
            label="Needs reorder"
            value={String(reorderCount)}
            detail={reorderCount > 0 ? 'At or below threshold' : 'All above threshold'}
            tone={reorderCount > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Out of stock"
            value={String(outCount)}
            detail={outCount > 0 ? 'Zero stock — urgent' : 'None depleted'}
            tone={outCount > 0 ? 'danger' : 'neutral'}
          />
        </div>

        <CollapsibleSection
          title="Add stock item"
          open={formOpen}
          onToggle={() => setFormOpen(o => !o)}
          actionLabel="+ New item"
        >
          <form onSubmit={save}>
            <FormSection title="Identification">
              <label>
                Item ID *
                <input value={form.itemId} onChange={e => update('itemId', e.target.value)} placeholder="I-001" required />
              </label>
              <label>
                Item name *
                <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Smoker" required />
              </label>
              <label>
                Category *
                <select value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label>
                Unit *
                <select value={form.unit} onChange={e => update('unit', e.target.value)}>
                  {UNITS.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Stock levels">
              <label>Opening stock<input type="number" min={0} value={form.openingStock} onChange={e => update('openingStock', e.target.value)} /></label>
              <label>Received<input type="number" min={0} value={form.received} onChange={e => update('received', e.target.value)} /></label>
              <label>Used<input type="number" min={0} value={form.used} onChange={e => update('used', e.target.value)} /></label>
              <label>Reorder level *<input type="number" min={0} value={form.reorderLevel} onChange={e => update('reorderLevel', e.target.value)} required /></label>
            </FormSection>

            <FormSection title="Optional details">
              <label>Supplier<input value={form.supplier} onChange={e => update('supplier', e.target.value)} /></label>
              <label>Storage location<input value={form.storageLocation} onChange={e => update('storageLocation', e.target.value)} placeholder="Store room A" /></label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Notes
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save item'}</button>
              <button className="btn" type="button" onClick={() => { setFormOpen(false); setError(''); }} disabled={busy}>Cancel</button>
            </div>
          </form>
        </CollapsibleSection>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Segmented
            options={[
              { key: 'all', label: `All (${rows.length})` },
              { key: 'reorder', label: `Reorder (${reorderCount})` },
              { key: 'out', label: `Out (${outCount})` },
            ]}
            value={filter}
            onChange={k => setFilter(k as typeof filter)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Sort by</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ width: 'auto' }}>
              <option value="name">Name</option>
              <option value="itemId">Item ID</option>
              <option value="stockAsc">Lowest stock first</option>
              <option value="status">Status</option>
            </select>
          </label>
        </div>

        <section className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Stock levels</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleRows.length} {visibleRows.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter === 'reorder'
                ? 'No items need reorder — all above threshold.'
                : filter === 'out'
                ? 'No items out of stock.'
                : 'No stock items yet. Click + New item to add one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>ID</th>
                    <th style={thLeft}>Item</th>
                    <th style={thLeft}>Category</th>
                    <th style={thRight}>Opening</th>
                    <th style={thRight}>Received</th>
                    <th style={thRight}>Used</th>
                    <th style={thRight}>Current</th>
                    <th style={thRight}>Reorder at</th>
                    <th style={thLeft}>Status</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(x => {
                    const cur = currentStock(x);
                    const st = statusOf(x);
                    const isEditing = editing === x._id;
                    return (
                      <tr key={x._id} style={bodyRow} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <td style={{ ...tdLeft, ...mono }}>{x.itemId}</td>
                        <td style={{ ...tdLeft, fontWeight: 500 }}>{x.name}</td>
                        <td style={tdLeft}>{x.category}</td>
                        <td style={tdRight}>{x.openingStock}</td>
                        <td style={tdRight}>
                          {isEditing ? (
                            <input type="number" min={0} value={editState.received} onChange={e => setEditState({ ...editState, received: e.target.value })} style={{ width: 72, textAlign: 'right' }} />
                          ) : x.received}
                        </td>
                        <td style={tdRight}>
                          {isEditing ? (
                            <input type="number" min={0} value={editState.used} onChange={e => setEditState({ ...editState, used: e.target.value })} style={{ width: 72, textAlign: 'right' }} />
                          ) : x.used}
                        </td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>
                          {cur} <span style={{ fontSize: 12, color: '#6b7280' }}>{x.unit}</span>
                        </td>
                        <td style={tdRight}>
                          {isEditing ? (
                            <input type="number" min={0} value={editState.reorderLevel} onChange={e => setEditState({ ...editState, reorderLevel: e.target.value })} style={{ width: 72, textAlign: 'right' }} />
                          ) : x.reorderLevel}
                        </td>
                        <td style={tdLeft}>
                          <Badge label={st === 'out' ? 'OUT' : st === 'reorder' ? 'REORDER' : 'OK'} tone={st === 'out' ? 'danger' : st === 'reorder' ? 'warn' : 'ok'} />
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
                    <td style={tdLeft} colSpan={3}>Totals</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + (x.openingStock ?? 0), 0)}</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + (x.received ?? 0), 0)}</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + (x.used ?? 0), 0)}</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + Math.max(0, currentStock(x)), 0)}</td>
                    <td style={tdRight}>—</td>
                    <td style={tdLeft} colSpan={2}>{visibleRows.length} items</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}