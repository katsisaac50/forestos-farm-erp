'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  mono,
} from '@/components/ui';

// ---- Types ----
type Item = {
  _id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  averageUnitCostUgx: number;
  storageLocation: string;
  supplier: string;
  linkedAssetCode: string;
  notes: string;
};

type Move = {
  _id: string;
  itemId: string;
  movementCode: string;
  movementType: string;
  movementDate: string;
  quantity: number;
  unitCostUgx: number;
  balanceAfter: number;
  referenceType: string;
  referenceCode: string;
  destinationOrSource: string;
  reason: string;
  notes: string;
};

type Dash = {
  totals: {
    items: number;
    lowStock: number;
    stockValueUgx: number;
    movementCount: number;
  };
  lowStock: Item[];
  recentMovements: Move[];
};

type ItemForm = {
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: string;
  reorderLevel: string;
  averageUnitCostUgx: string;
  supplier: string;
  storageLocation: string;
  linkedAssetCode: string;
  notes: string;
};

type MoveForm = {
  itemId: string;
  movementCode: string;
  movementType: string;
  movementDate: string;
  quantity: string;
  unitCostUgx: string;
  referenceType: string;
  referenceCode: string;
  destinationOrSource: string;
  reason: string;
  notes: string;
};

const CATEGORIES = [
  'seedlings',
  'spare_parts',
  'fuel',
  'tools',
  'beekeeping',
  'fertiliser',
  'safety',
  'packaging',
  'other',
];

const MOVEMENT_TYPES = [
  'receipt',
  'issue',
  'return',
  'adjustment_increase',
  'adjustment_decrease',
  'write_off',
];

const label = (s: string) =>
  s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

const money = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(n);

const blankItem = (): ItemForm => ({
  itemCode: '',
  name: '',
  category: 'spare_parts',
  unit: 'piece',
  quantityOnHand: '0',
  reorderLevel: '1',
  averageUnitCostUgx: '0',
  supplier: '',
  storageLocation: '',
  linkedAssetCode: '',
  notes: '',
});

const blankMove = (): MoveForm => ({
  itemId: '',
  movementCode: '',
  movementType: 'receipt',
  movementDate: new Date().toISOString().slice(0, 10),
  quantity: '1',
  unitCostUgx: '0',
  referenceType: '',
  referenceCode: '',
  destinationOrSource: '',
  reason: '',
  notes: '',
});

function movementTone(t: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  if (t === 'receipt' || t === 'return' || t === 'adjustment_increase') return 'ok';
  if (t === 'issue') return 'warn';
  if (t === 'write_off' || t === 'adjustment_decrease') return 'danger';
  if (t === 'opening_balance') return 'info';
  return 'neutral';
}

function isOutflow(t: string): boolean {
  return ['issue', 'adjustment_decrease', 'write_off'].includes(t);
}

export default function InventoryControlPage() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [itemForm, setItemForm] = useState<ItemForm>(blankItem());
  const [moveForm, setMoveForm] = useState<MoveForm>(blankMove());
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [moveFormOpen, setMoveFormOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [moveTypeFilter, setMoveTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const itemMap = useMemo(
    () => Object.fromEntries(items.map(i => [i._id, i])),
    [items]
  );

  async function refresh() {
    try {
      const [d, i, m] = await Promise.all([
        getData<Dash>('/inventory-control/dashboard'),
        getData<Item[]>('/inventory-control/items'),
        getData<Move[]>('/inventory-control/movements'),
      ]);
      setDash(d);
      setItems(Array.isArray(i) ? i : []);
      setMoves(Array.isArray(m) ? m : []);
      if (!moveForm.itemId && i.length > 0) {
        setMoveForm(prev => ({
          ...prev,
          itemId: i[0]._id,
          unitCostUgx: String(i[0].averageUnitCostUgx ?? 0),
        }));
      }
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load inventory. Sign in as an owner.'
      );
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter-driven fetch for items
  useEffect(() => {
    const controller = { cancelled: false };
    (async () => {
      try {
        const q = new URLSearchParams();
        if (filterCategory) q.set('category', filterCategory);
        if (filterLowStock) q.set('lowStock', 'true');
        const r = await getData<Item[]>(
          '/inventory-control/items' + (q.toString() ? '?' + q.toString() : '')
        );
        if (!controller.cancelled) setItems(Array.isArray(r) ? r : []);
      } catch (e) {
        if (!controller.cancelled)
          setError(e instanceof Error ? e.message : 'Could not filter items');
      }
    })();
    return () => {
      controller.cancelled = true;
    };
  }, [filterCategory, filterLowStock]);

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData('/inventory-control/items', {
        itemCode: itemForm.itemCode.trim(),
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit.trim(),
        quantityOnHand: Number(itemForm.quantityOnHand),
        reorderLevel: Number(itemForm.reorderLevel),
        averageUnitCostUgx: Number(itemForm.averageUnitCostUgx),
        supplier: itemForm.supplier.trim() || undefined,
        storageLocation: itemForm.storageLocation.trim() || undefined,
        linkedAssetCode: itemForm.linkedAssetCode.trim() || undefined,
        notes: itemForm.notes.trim() || undefined,
      });
      setNotice('Stock item created. Opening quantity was recorded as a stock movement.');
      setItemForm(blankItem());
      setItemFormOpen(false);
      await refresh();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save item');
    } finally {
      setBusy(false);
    }
  }

  async function saveMove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData('/inventory-control/movements', {
        itemId: moveForm.itemId,
        movementCode: moveForm.movementCode.trim(),
        movementType: moveForm.movementType,
        movementDate: moveForm.movementDate,
        quantity: Number(moveForm.quantity),
        unitCostUgx: Number(moveForm.unitCostUgx),
        referenceType: moveForm.referenceType.trim() || undefined,
        referenceCode: moveForm.referenceCode.trim() || undefined,
        destinationOrSource: moveForm.destinationOrSource.trim() || undefined,
        reason: moveForm.reason.trim() || undefined,
        notes: moveForm.notes.trim() || undefined,
      });
      setNotice('Stock movement recorded and balance updated.');
      const retained = moveForm.itemId;
      const retainedCost =
        items.find(i => i._id === retained)?.averageUnitCostUgx ?? 0;
      setMoveForm({ ...blankMove(), itemId: retained, unitCostUgx: String(retainedCost) });
      setMoveFormOpen(false);
      await refresh();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record movement');
    } finally {
      setBusy(false);
    }
  }

  async function updateReorderLevel(item: Item) {
    const level = window.prompt(
      `Reorder level for ${item.name} (current ${item.reorderLevel} ${item.unit}):`,
      String(item.reorderLevel)
    );
    if (level === null) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await patchData(`/inventory-control/items/${item._id}`, {
        reorderLevel: Number(level),
      });
      setNotice('Reorder level updated.');
      await refresh();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update item');
    } finally {
      setBusy(false);
    }
  }

  function updateItemField<K extends keyof ItemForm>(key: K, value: ItemForm[K]) {
    setItemForm(prev => ({ ...prev, [key]: value }));
  }

  function updateMoveField<K extends keyof MoveForm>(key: K, value: MoveForm[K]) {
    setMoveForm(prev => ({ ...prev, [key]: value }));
  }

  function onSelectItemForMove(itemId: string) {
    const it = items.find(i => i._id === itemId);
    setMoveForm(prev => ({
      ...prev,
      itemId,
      unitCostUgx: String(it?.averageUnitCostUgx ?? 0),
    }));
  }

  const visibleMoves = moves.filter(m => {
    if (moveTypeFilter === 'all') return true;
    if (moveTypeFilter === 'in') return !isOutflow(m.movementType);
    if (moveTypeFilter === 'out') return isOutflow(m.movementType);
    return true;
  });

  const lowStockCount = dash?.totals.lowStock ?? 0;
  const totalStockValue = dash?.totals.stockValueUgx ?? 0;
  const totalMovements = dash?.totals.movementCount ?? 0;
  const totalItems = dash?.totals.items ?? 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/inventory', 'Basic inventory'],
            ['/inventory-control', 'Central stock'],
            ['/procurement', 'Procurement'],
            ['/maintenance', 'Maintenance & assets'],
            ['/nursery', 'Nursery'],
            ['/cost-intelligence', 'Cost intelligence'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.4,
                color: '#36764b',
                margin: '0 0 8px',
              }}
            >
              INTEGRATED STOCK CONTROL
            </p>
            <h1 style={{ margin: 0 }}>Central inventory register</h1>
            <p className="muted" style={{ margin: '4px 0 0', maxWidth: 900 }}>
              One stock register for seedlings, spare parts, fuel, tools, beekeeping
              supplies and farm materials.
            </p>
          </div>
          <button className="btn" onClick={() => void refresh()} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MetricCard
            label="Stock items"
            value={String(totalItems)}
            detail="Registered in the register"
          />
          <MetricCard
            label="Low-stock items"
            value={String(lowStockCount)}
            detail={
              lowStockCount > 0 ? 'At or below reorder level' : 'All above threshold'
            }
            tone={lowStockCount > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Estimated stock value"
            value={money(totalStockValue)}
            detail="Qty × average unit cost"
          />
          <MetricCard
            label="Recorded movements"
            value={String(totalMovements)}
            detail="Receipts, issues, adjustments"
          />
        </div>

        {/* Register item form */}
        <CollapsibleSection
          title="Register stock item"
          open={itemFormOpen}
          onToggle={() => setItemFormOpen(o => !o)}
          actionLabel="+ New item"
        >
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            If opening quantity is greater than zero, ForestOS creates an opening-balance
            movement automatically.
          </p>
          <form onSubmit={saveItem}>
            <FormSection title="Identification">
              <label>
                Item code *
                <input
                  value={itemForm.itemCode}
                  onChange={e => updateItemField('itemCode', e.target.value)}
                  placeholder="STK-001"
                  required
                />
              </label>
              <label>
                Item name *
                <input
                  value={itemForm.name}
                  onChange={e => updateItemField('name', e.target.value)}
                  required
                />
              </label>
              <label>
                Category *
                <select
                  value={itemForm.category}
                  onChange={e => updateItemField('category', e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {label(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit *
                <input
                  value={itemForm.unit}
                  onChange={e => updateItemField('unit', e.target.value)}
                  placeholder="piece, litre, seedling"
                  required
                />
              </label>
            </FormSection>

            <FormSection title="Stock levels">
              <label>
                Opening quantity
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={itemForm.quantityOnHand}
                  onChange={e => updateItemField('quantityOnHand', e.target.value)}
                />
              </label>
              <label>
                Reorder level
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={itemForm.reorderLevel}
                  onChange={e => updateItemField('reorderLevel', e.target.value)}
                />
              </label>
              <label>
                Average unit cost (UGX)
                <input
                  type="number"
                  min={0}
                  value={itemForm.averageUnitCostUgx}
                  onChange={e => updateItemField('averageUnitCostUgx', e.target.value)}
                />
              </label>
            </FormSection>

            <FormSection title="Location & attribution">
              <label>
                Supplier
                <input
                  value={itemForm.supplier}
                  onChange={e => updateItemField('supplier', e.target.value)}
                />
              </label>
              <label>
                Storage location
                <input
                  value={itemForm.storageLocation}
                  onChange={e => updateItemField('storageLocation', e.target.value)}
                  placeholder="Store room A"
                />
              </label>
              <label>
                Linked asset code
                <input
                  value={itemForm.linkedAssetCode}
                  onChange={e => updateItemField('linkedAssetCode', e.target.value)}
                />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Notes
              <textarea
                value={itemForm.notes}
                onChange={e => updateItemField('notes', e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Create stock item'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setItemFormOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Record movement form */}
        <CollapsibleSection
          title="Record stock movement"
          open={moveFormOpen}
          onToggle={() => setMoveFormOpen(o => !o)}
          actionLabel="+ New movement"
        >
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Receipts and returns increase stock; issues, write-offs and decreases reduce it.
            Stock cannot fall below zero.
          </p>
          <form onSubmit={saveMove}>
            <FormSection title="Movement details">
              <label style={{ gridColumn: 'span 2' }}>
                Stock item *
                <select
                  value={moveForm.itemId}
                  onChange={e => onSelectItemForMove(e.target.value)}
                  required
                >
                  <option value="">Select item</option>
                  {items.map(i => (
                    <option key={i._id} value={i._id}>
                      {i.itemCode} — {i.name} ({i.quantityOnHand} {i.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Movement code *
                <input
                  value={moveForm.movementCode}
                  onChange={e => updateMoveField('movementCode', e.target.value)}
                  placeholder="MOV-001"
                  required
                />
              </label>
              <label>
                Movement type *
                <select
                  value={moveForm.movementType}
                  onChange={e => updateMoveField('movementType', e.target.value)}
                >
                  {MOVEMENT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {label(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date *
                <input
                  type="date"
                  value={moveForm.movementDate}
                  onChange={e => updateMoveField('movementDate', e.target.value)}
                  required
                />
              </label>
              <label>
                Quantity *
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  value={moveForm.quantity}
                  onChange={e => updateMoveField('quantity', e.target.value)}
                  required
                />
              </label>
              <label>
                Unit cost (UGX)
                <input
                  type="number"
                  min={0}
                  value={moveForm.unitCostUgx}
                  onChange={e => updateMoveField('unitCostUgx', e.target.value)}
                />
              </label>
            </FormSection>

            <FormSection title="Reference">
              <label>
                Reference type
                <input
                  value={moveForm.referenceType}
                  onChange={e => updateMoveField('referenceType', e.target.value)}
                  placeholder="purchase_order, task…"
                />
              </label>
              <label>
                Reference code
                <input
                  value={moveForm.referenceCode}
                  onChange={e => updateMoveField('referenceCode', e.target.value)}
                />
              </label>
              <label>
                Source / destination
                <input
                  value={moveForm.destinationOrSource}
                  onChange={e =>
                    updateMoveField('destinationOrSource', e.target.value)
                  }
                />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Reason / notes
              <textarea
                value={moveForm.reason}
                onChange={e => updateMoveField('reason', e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy || !items.length}>
                {busy ? 'Saving…' : 'Record movement'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setMoveFormOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Stock register table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Stock register</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span className="muted">Category</span>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="">All categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={filterLowStock}
                onChange={e => setFilterLowStock(e.target.checked)}
              />
              <span>Only low stock</span>
            </label>
          </div>

          {items.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filterCategory || filterLowStock
                ? 'No stock items match these filters.'
                : 'No stock items registered yet. Click + New item to add the first one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Item</th>
                    <th style={thLeft}>Category</th>
                    <th style={thRight}>On hand</th>
                    <th style={thRight}>Reorder level</th>
                    <th style={thRight}>Unit cost</th>
                    <th style={thRight}>Stock value</th>
                    <th style={thLeft}>Location</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => {
                    const needsReorder = i.quantityOnHand <= i.reorderLevel;
                    return (
                      <tr key={i._id} style={bodyRow}>
                        <td style={tdLeft}>
                          <div style={{ ...mono, fontWeight: 600 }}>{i.itemCode}</div>
                          <div>{i.name}</div>
                          {i.supplier && (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {i.supplier}
                            </div>
                          )}
                        </td>
                        <td style={tdLeft}>{label(i.category)}</td>
                        <td style={tdRight}>
                          {i.quantityOnHand} {i.unit}
                        </td>
                        <td style={tdRight}>
                          <div>
                            {i.reorderLevel} {i.unit}
                          </div>
                          {needsReorder && (
                            <div style={{ marginTop: 4 }}>
                              <Badge label="Reorder" tone="warn" />
                            </div>
                          )}
                        </td>
                        <td style={tdRight}>{money(i.averageUnitCostUgx)}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>
                          {money(i.quantityOnHand * i.averageUnitCostUgx)}
                        </td>
                        <td style={tdLeft}>{i.storageLocation || '—'}</td>
                        <td style={tdLeft}>
                          <button
                            className="btn"
                            onClick={() => void updateReorderLevel(i)}
                            disabled={busy}
                          >
                            Set reorder level
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Movements table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Recent stock movements</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleMoves.length} of {moves.length}
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Segmented
              options={[
                { key: 'all', label: `All (${moves.length})` },
                {
                  key: 'in',
                  label: `In (${moves.filter(m => !isOutflow(m.movementType)).length})`,
                },
                {
                  key: 'out',
                  label: `Out (${moves.filter(m => isOutflow(m.movementType)).length})`,
                },
              ]}
              value={moveTypeFilter}
              onChange={k => setMoveTypeFilter(k as typeof moveTypeFilter)}
            />
          </div>

          {visibleMoves.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {moves.length === 0
                ? 'No stock movements recorded yet.'
                : 'No movements match this filter.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Date</th>
                    <th style={thLeft}>Movement</th>
                    <th style={thLeft}>Item</th>
                    <th style={thLeft}>Type</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Balance after</th>
                    <th style={thLeft}>Reference / reason</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMoves.slice(0, 100).map(m => {
                    const outflow = isOutflow(m.movementType);
                    return (
                      <tr key={m._id} style={bodyRow}>
                        <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {m.movementDate}
                        </td>
                        <td style={{ ...tdLeft, ...mono, fontSize: 12 }}>
                          {m.movementCode}
                        </td>
                        <td style={tdLeft}>{itemMap[m.itemId]?.name ?? m.itemId}</td>
                        <td style={tdLeft}>
                          <Badge
                            label={label(m.movementType)}
                            tone={movementTone(m.movementType)}
                          />
                        </td>
                        <td
                          style={{
                            ...tdRight,
                            fontWeight: 600,
                            color: outflow ? '#b91c1c' : '#15803d',
                          }}
                        >
                          {outflow ? '−' : '+'}
                          {m.quantity}
                        </td>
                        <td style={tdRight}>{m.balanceAfter}</td>
                        <td style={{ ...tdLeft, fontSize: 12, maxWidth: 240 }}>
                          {m.referenceCode || m.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Callout title="Stock register scope">
          <p style={{ margin: '0 0 8px', fontSize: 13 }}>
            This is a <strong>separate central stock register</strong>. Phase 19 goods
            receipts, Phase 18 spare-parts records, and nursery stock are not automatically
            synchronised yet.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Movement codes should be unique by operating procedure. Use a verified physical
            count before recording opening balances. Average-cost valuation is indicative
            and is not a full accounting valuation.
          </p>
        </Callout>
      </main>
    </div>
  );
}