'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';

type Block = {
  _id: string;
  blockId: string;
  location: string;
  areaAcres: number;
  initialTrees?: number;
  latestLiveTrees?: number;
};

type Sample = {
  _id: string;
  blockId: string;
  sampleDate: string;
  sampleCode: string;
  treeCount: number;
  averageHeightM: number;
  averageDbhCm: number;
  recordedBy: string;
  notes?: string;
  createdAt?: string;
};

type FormState = {
  blockId: string;
  sampleDate: string;
  sampleCode: string;
  treeCount: number;
  averageHeightM: number;
  averageDbhCm: number;
  notes: string;
};

const blank = (blockId = ''): FormState => ({
  blockId,
  sampleDate: new Date().toISOString().slice(0, 10),
  sampleCode: `GS-${Date.now().toString().slice(-6)}`,
  treeCount: 10,
  averageHeightM: 0,
  averageDbhCm: 0,
  notes: '',
});

export default function Growth() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rows, setRows] = useState<Sample[]>([]);
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [b, g] = await Promise.all([
        getData<Block[]>('/plantations'),
        getData<Sample[]>('/growth'),
      ]);
      setBlocks(b);
      setRows(g);
      // If the form doesn't have a blockId yet, default to the first block.
      setForm(prev => (prev.blockId ? prev : blank(b[0]?.blockId ?? '')));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load growth records');
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
      await postData('/growth', form);
      setNotice('Growth sample saved.');
      setForm(blank(blocks[0]?.blockId ?? ''));
      setFormOpen(false);
      await load();
      // Auto-dismiss the notice after 4 seconds
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save sample');
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/plantations', 'Plantations'],
            ['/plantation-intelligence', 'Plantation intelligence'],
            ['/growth', 'Growth samples'],
            ['/inspections', 'Inspections'],
            ['/field-logs', 'Field logs'],
            ['/executive', 'Executive intelligence'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Growth monitoring</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Record repeatable sample-tree measurements. Use the same sampling method and
          comparable sample areas each time so trends are meaningful.
        </p>

        {error && <p className="error">{error}</p>}
        {notice && (
          <p className="panel" style={{ borderColor: '#4ade80', color: '#15803d' }}>
            ✓ {notice}
          </p>
        )}

        {/* Collapsible record form */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setFormOpen(o => !o)}
          >
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{formOpen ? '▾' : '▸'}</span>
              Record a sample
            </h2>
            {!formOpen && blocks.length > 0 && (
              <button
                className="btn"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setFormOpen(true);
                }}
              >
                + New sample
              </button>
            )}
          </div>

          {formOpen && (
            <form onSubmit={save} style={{ marginTop: 20 }}>
              {blocks.length === 0 ? (
                <p className="muted">
                  Create a <Link href="/plantations">plantation block</Link> first.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16,
                    }}
                  >
                    <label>
                      Block
                      <select
                        value={form.blockId}
                        onChange={e => update('blockId', e.target.value)}
                        required
                      >
                        {blocks.map(b => (
                          <option key={b.blockId} value={b.blockId}>
                            {b.blockId} · {b.location} · {b.areaAcres} ac
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Sample date
                      <input
                        type="date"
                        value={form.sampleDate}
                        onChange={e => update('sampleDate', e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Sample code
                      <input
                        value={form.sampleCode}
                        onChange={e => update('sampleCode', e.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Trees sampled
                      <input
                        type="number"
                        min={1}
                        value={form.treeCount}
                        onChange={e => update('treeCount', Number(e.target.value))}
                        required
                      />
                    </label>

                    <label>
                      Avg height (m)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.averageHeightM}
                        onChange={e => update('averageHeightM', Number(e.target.value))}
                        required
                      />
                    </label>

                    <label>
                      Avg DBH (cm)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.averageDbhCm}
                        onChange={e => update('averageDbhCm', Number(e.target.value))}
                        required
                      />
                    </label>
                  </div>

                  <label style={{ marginTop: 16, display: 'block' }}>
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={e => update('notes', e.target.value)}
                      rows={2}
                      style={{ width: '100%', marginTop: 4 }}
                      placeholder="Sampling method, which trees were measured, observations…"
                    />
                  </label>

                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button className="btn" disabled={busy}>
                      {busy ? 'Saving…' : 'Save sample'}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setFormOpen(false);
                        setError('');
                      }}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </section>

        {/* Samples table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Recorded samples</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {rows.length} {rows.length === 1 ? 'sample' : 'samples'}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No samples yet. Click <strong>+ New sample</strong> to record the first measurement.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>
                      Date
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>
                      Block
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>
                      Sample code
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                      Trees
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                      Height (m)
                    </th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                      DBH (cm)
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>
                      Recorded by
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr
                      key={r._id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <td style={{ padding: '10px 8px' }}>{r.sampleDate?.slice(0, 10)}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{r.blockId}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                        {r.sampleCode}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{r.treeCount}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {r.averageHeightM.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {r.averageDbhCm.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#6b7280', fontSize: 13 }}>
                        {r.recordedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Measurement discipline callout */}
        <section
          className="panel"
          style={{
            borderLeft: '4px solid #f59e0b',
            backgroundColor: '#fffbeb',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 6 }}>📏 Measurement discipline</strong>
          <p className="muted" style={{ margin: 0 }}>
            Write down the sampling method and which trees were measured. A sample average
            is not a census and does not by itself determine timber volume, harvest readiness
            or sale value.
          </p>
        </section>
      </main>
    </div>
  );
}