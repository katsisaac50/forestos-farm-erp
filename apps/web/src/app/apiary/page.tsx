'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';
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

type Hive = {
  _id: string;
  hiveId: string;
  organizationId: string;
  apiarySite: string;
  gpsOrLandmark?: string;
  installedDate?: string;
  hiveType?: string;
  colonyStatus: string;
  queenSeen?: string;
  lastInspection?: string;
  nextInspectionDue?: string;
  honeyHarvestedKg: number;
  repairsNeeded?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  hiveId: string;
  apiarySite: string;
  gpsOrLandmark: string;
  installedDate: string;
  hiveType: string;
  colonyStatus: string;
  honeyHarvestedKg: string;
  repairsNeeded: string;
  notes: string;
};

type EditState = {
  colonyStatus: string;
  honeyHarvestedKg: string;
  repairsNeeded: string;
  notes: string;
};

type SortKey = 'hiveId' | 'site' | 'status' | 'honey';

const HIVE_TYPES = ['Langstroth', 'Top-bar', 'Other'];
const COLONY_STATUSES = ['Occupied', 'Empty', 'Weak', 'Queenless', 'Absconded', 'Unknown'];

const blank = (): FormState => ({
  hiveId: '',
  apiarySite: '',
  gpsOrLandmark: '',
  installedDate: '',
  hiveType: 'Other',
  colonyStatus: 'Unknown',
  honeyHarvestedKg: '0',
  repairsNeeded: '',
  notes: '',
});

function statusTone(s: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'Occupied':
      return 'ok';
    case 'Weak':
      return 'warn';
    case 'Queenless':
    case 'Absconded':
      return 'danger';
    case 'Empty':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function Apiary() {
  const [rows, setRows] = useState<Hive[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'needs' | 'occupied' | 'empty'>('all');
  const [sort, setSort] = useState<SortKey>('hiveId');
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    colonyStatus: '',
    honeyHarvestedKg: '',
    repairsNeeded: '',
    notes: '',
  });

  async function load() {
    try {
      setRows(await getData<Hive[]>('/hives'));
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
      await postData('/hives', {
        hiveId: form.hiveId.trim(),
        apiarySite: form.apiarySite.trim(),
        gpsOrLandmark: form.gpsOrLandmark.trim() || undefined,
        installedDate: form.installedDate || undefined,
        hiveType: form.hiveType,
        colonyStatus: form.colonyStatus,
        honeyHarvestedKg: Number(form.honeyHarvestedKg),
        repairsNeeded: form.repairsNeeded.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setNotice('Hive registered.');
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

  function startEdit(x: Hive) {
    setEditing(x._id);
    setEditState({
      colonyStatus: x.colonyStatus ?? 'Unknown',
      honeyHarvestedKg: String(x.honeyHarvestedKg ?? 0),
      repairsNeeded: x.repairsNeeded ?? '',
      notes: x.notes ?? '',
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditState({ colonyStatus: '', honeyHarvestedKg: '', repairsNeeded: '', notes: '' });
  }

  async function saveEdit(id: string) {
    try {
      await patchData(`/hives/${id}`, {
        colonyStatus: editState.colonyStatus,
        honeyHarvestedKg: Number(editState.honeyHarvestedKg),
        repairsNeeded: editState.repairsNeeded.trim() || undefined,
        notes: editState.notes.trim() || undefined,
      });
      setNotice('Hive updated.');
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

  const occupied = rows.filter(x => x.colonyStatus === 'Occupied').length;
  const needsAttention = rows.filter(x => ['Weak', 'Queenless', 'Absconded'].includes(x.colonyStatus)).length;
  const totalHoney = rows.reduce((s, x) => s + (x.honeyHarvestedKg ?? 0), 0);
  const sites = new Set(rows.map(r => r.apiarySite)).size;

  const filtered =
    filter === 'needs'
      ? rows.filter(x => ['Weak', 'Queenless', 'Absconded'].includes(x.colonyStatus))
      : filter === 'occupied'
      ? rows.filter(x => x.colonyStatus === 'Occupied')
      : filter === 'empty'
      ? rows.filter(x => x.colonyStatus === 'Empty')
      : rows;

  const visibleRows = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'site':
        return a.apiarySite.localeCompare(b.apiarySite);
      case 'status':
        return a.colonyStatus.localeCompare(b.colonyStatus);
      case 'honey':
        return (b.honeyHarvestedKg ?? 0) - (a.honeyHarvestedKg ?? 0);
      default:
        return a.hiveId.localeCompare(b.hiveId);
    }
  });

  return (
    <div className="shell">
      <NavSidebar />

      <main id="main-content" className="main">
        <h1>Apiary register</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          One record per hive · colony status and harvest tracking
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
          <MetricCard label="Hives" value={String(rows.length)} detail={`${sites} apiary sites`} />
          <MetricCard
            label="Occupied"
            value={String(occupied)}
            detail={occupied > 0 ? 'Active colonies' : 'No active colonies'}
            tone={occupied > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            label="Needs attention"
            value={String(needsAttention)}
            detail={needsAttention > 0 ? 'Weak, queenless, or absconded' : 'All colonies healthy'}
            tone={needsAttention > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Total honey"
            value={`${totalHoney.toFixed(1)} kg`}
            detail="Recorded harvest"
            tone={totalHoney > 0 ? 'success' : 'neutral'}
          />
        </div>

        <CollapsibleSection
          title="Register hive"
          open={formOpen}
          onToggle={() => setFormOpen(o => !o)}
          actionLabel="+ New hive"
        >
          <form onSubmit={save}>
            <FormSection title="Identification">
              <label>
                Hive ID *
                <input value={form.hiveId} onChange={e => update('hiveId', e.target.value)} placeholder="H-004" required />
              </label>
              <label>
                Apiary site *
                <input value={form.apiarySite} onChange={e => update('apiarySite', e.target.value)} placeholder="Block A" required />
              </label>
              <label>
                Hive type
                <select value={form.hiveType} onChange={e => update('hiveType', e.target.value)}>
                  {HIVE_TYPES.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label>
                Colony status
                <select value={form.colonyStatus} onChange={e => update('colonyStatus', e.target.value)}>
                  {COLONY_STATUSES.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Placement">
              <label>
                GPS or landmark
                <input value={form.gpsOrLandmark} onChange={e => update('gpsOrLandmark', e.target.value)} placeholder="Near the north gate" />
              </label>
              <label>
                Installed date
                <input type="date" value={form.installedDate} onChange={e => update('installedDate', e.target.value)} />
              </label>
            </FormSection>

            <FormSection title="Harvest & maintenance">
              <label>
                Honey harvested (kg)
                <input type="number" min={0} step="0.1" value={form.honeyHarvestedKg} onChange={e => update('honeyHarvestedKg', e.target.value)} />
              </label>
              <label>
                Repairs needed
                <input value={form.repairsNeeded} onChange={e => update('repairsNeeded', e.target.value)} placeholder="Lid cracked" />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Notes
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save hive'}</button>
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
              { key: 'occupied', label: `Occupied (${occupied})` },
              { key: 'needs', label: `Needs attention (${needsAttention})` },
              { key: 'empty', label: `Empty (${rows.filter(x => x.colonyStatus === 'Empty').length})` },
            ]}
            value={filter}
            onChange={k => setFilter(k as typeof filter)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Sort by</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ width: 'auto' }}>
              <option value="hiveId">Hive ID</option>
              <option value="site">Apiary site</option>
              <option value="status">Colony status</option>
              <option value="honey">Honey harvested</option>
            </select>
          </label>
        </div>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Hives</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleRows.length} {visibleRows.length === 1 ? 'hive' : 'hives'}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter !== 'all'
                ? 'No hives match this filter.'
                : 'No hives registered yet. Click + New hive to add the first one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>ID</th>
                    <th style={thLeft}>Site</th>
                    <th style={thLeft}>Type</th>
                    <th style={thLeft}>Colony status</th>
                    <th style={thLeft}>Queen</th>
                    <th style={thRight}>Honey (kg)</th>
                    <th style={thLeft}>Last inspected</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(x => {
                    const isEditing = editing === x._id;
                    return (
                      <tr key={x._id} style={bodyRow} onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <td style={{ ...tdLeft, ...mono }}>{x.hiveId}</td>
                        <td style={tdLeft}>{x.apiarySite}</td>
                        <td style={tdLeft}>{x.hiveType ?? '—'}</td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <select value={editState.colonyStatus} onChange={e => setEditState({ ...editState, colonyStatus: e.target.value })} style={{ width: 140 }}>
                              {COLONY_STATUSES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <Badge label={x.colonyStatus} tone={statusTone(x.colonyStatus)} />
                          )}
                        </td>
                        <td style={tdLeft}>{x.queenSeen ?? '—'}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>
                          {isEditing ? (
                            <input type="number" min={0} step="0.1" value={editState.honeyHarvestedKg} onChange={e => setEditState({ ...editState, honeyHarvestedKg: e.target.value })} style={{ width: 80, textAlign: 'right' }} />
                          ) : (
                            (x.honeyHarvestedKg ?? 0).toFixed(1)
                          )}
                        </td>
                        <td style={tdLeft}>{x.lastInspection?.slice(0, 10) ?? '—'}</td>
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
                    <td style={tdLeft} colSpan={4}>Totals ({visibleRows.length} shown)</td>
                    <td style={tdLeft}>—</td>
                    <td style={tdRight}>{visibleRows.reduce((s, x) => s + (x.honeyHarvestedKg ?? 0), 0).toFixed(1)}</td>
                    <td style={tdLeft} colSpan={2}>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <Callout title="Hive inspection discipline">
          Colony status reflects the last recorded assessment. Update it after every inspection to keep the apiary dashboard accurate. Hives marked Queenless, Weak, or Absconded require a follow-up inspection; absconded hives should be cleaned and rebaited before reuse.
        </Callout>
      </main>
    </div>
  );
}