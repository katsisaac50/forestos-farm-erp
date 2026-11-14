'use client';
import { useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';

type Block = {
  _id: string;
  blockId: string;
  organizationId: string;
  location: string;
  areaAcres: number;
  cloneOrProvenance?: string;
  plantingDate?: string;
  initialTrees?: number;
  latestLiveTrees?: number;
  averageHeightM?: number;
  averageDbhCm?: number;
  nextAction?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type IntelligenceBlock = Block & {
  growthSampleCount: number;
  latestGrowthSample: null | {
    sampleDate: string;
    averageHeightM: number;
    averageDbhCm: number;
    treeCount: number;
  };
  survivalRatePercent: number | null;
  treeLossCount: number | null;
};

type IntelligenceResponse = {
  blocks: IntelligenceBlock[];
  totals: {
    blocks: number;
    areaAcres: number;
    initialTreesRecorded: number;
    liveTreesRecorded: number;
    blocksMissingTreeCounts: number;
  };
};

type EditState = {
  latestLiveTrees: string;
  averageHeightM: string;
  averageDbhCm: string;
  nextAction: string;
};

export default function Plantations() {
  const [rows, setRows] = useState<IntelligenceBlock[]>([]);
  const [totals, setTotals] = useState<IntelligenceResponse['totals'] | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    latestLiveTrees: '',
    averageHeightM: '',
    averageDbhCm: '',
    nextAction: '',
  });

  // Create form state
  const [formOpen, setFormOpen] = useState(false);
  const [blockId, setBlockId] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [cloneOrProvenance, setClone] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [initial, setInitial] = useState('');
  const [live, setLive] = useState('');
  const [avgHeight, setAvgHeight] = useState('');
  const [avgDbh, setAvgDbh] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    try {
      const [list, intel] = await Promise.all([
        getData<Block[]>('/plantations'),
        getData<IntelligenceResponse>('/plantations/intelligence'),
      ]);
      const byId = new Map(intel.blocks.map(b => [b._id, b]));
      setRows(
        list.map(b => {
          const i = byId.get(b._id);
          return {
            ...b,
            growthSampleCount: i?.growthSampleCount ?? 0,
            latestGrowthSample: i?.latestGrowthSample ?? null,
            survivalRatePercent: i?.survivalRatePercent ?? null,
            treeLossCount: i?.treeLossCount ?? null,
          };
        })
      );
      setTotals(intel.totals);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API unavailable');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await postData('/plantations', {
        blockId: blockId.trim(),
        location: location.trim(),
        areaAcres: Number(area),
        cloneOrProvenance: cloneOrProvenance.trim() || undefined,
        plantingDate: plantingDate || undefined,
        initialTrees: initial ? Number(initial) : undefined,
        latestLiveTrees: live ? Number(live) : undefined,
        averageHeightM: avgHeight ? Number(avgHeight) : undefined,
        averageDbhCm: avgDbh ? Number(avgDbh) : undefined,
        nextAction: nextAction.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setBlockId('');
      setLocation('');
      setArea('');
      setClone('');
      setPlantingDate('');
      setInitial('');
      setLive('');
      setAvgHeight('');
      setAvgDbh('');
      setNextAction('');
      setNotes('');
      setFormOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: IntelligenceBlock) {
    setEditing(row._id);
    setEditState({
      latestLiveTrees: row.latestLiveTrees !== undefined ? String(row.latestLiveTrees) : '',
      averageHeightM: row.averageHeightM !== undefined ? String(row.averageHeightM) : '',
      averageDbhCm: row.averageDbhCm !== undefined ? String(row.averageDbhCm) : '',
      nextAction: row.nextAction ?? '',
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditState({ latestLiveTrees: '', averageHeightM: '', averageDbhCm: '', nextAction: '' });
  }

  async function saveEdit(id: string) {
    try {
      await patchData(`/plantations/${id}`, {
        latestLiveTrees: editState.latestLiveTrees ? Number(editState.latestLiveTrees) : undefined,
        averageHeightM: editState.averageHeightM ? Number(editState.averageHeightM) : undefined,
        averageDbhCm: editState.averageDbhCm ? Number(editState.averageDbhCm) : undefined,
        nextAction: editState.nextAction.trim() || undefined,
      });
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  function survivalDisplay(row: IntelligenceBlock) {
    if (row.survivalRatePercent !== null && row.survivalRatePercent !== undefined) {
      return row.survivalRatePercent.toFixed(1) + '%';
    }
    if (row.initialTrees && row.latestLiveTrees !== undefined) {
      return ((100 * row.latestLiveTrees) / row.initialTrees).toFixed(1) + '%';
    }
    return '—';
  }

  return (
    <div className="shell">
      <NavSidebar />

      <main id="main-content" className="main">
        <h1>Plantation register</h1>
        <p className="muted">One record per eucalyptus block. Click a row&apos;s Edit button to update measurements.</p>

        <section className="panel">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setFormOpen(o => !o)}
          >
            <h2 style={{ margin: 0 }}>
              {formOpen ? '▾ Add block' : '▸ Add block'}
            </h2>
            {!formOpen && (
              <button
                className="btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormOpen(true);
                }}
              >
                + New block
              </button>
            )}
          </div>

          {formOpen && (
            <form onSubmit={save} style={{ marginTop: 16 }}>
              <label>
                Block ID *
                <input value={blockId} onChange={e => setBlockId(e.target.value)} required placeholder="BLK-003" />
              </label>
              <label>
                Location *
                <input value={location} onChange={e => setLocation(e.target.value)} required placeholder="East Valley" />
              </label>
              <label>
                Area (acres) *
                <input type="number" min="0" step=".1" value={area} onChange={e => setArea(e.target.value)} required />
              </label>
              <label>
                Clone / provenance
                <input value={cloneOrProvenance} onChange={e => setClone(e.target.value)} placeholder="Eucalyptus grandis" />
              </label>
              <label>
                Planting date
                <input type="date" value={plantingDate} onChange={e => setPlantingDate(e.target.value)} />
              </label>
              <label>
                Initial trees
                <input type="number" min="0" value={initial} onChange={e => setInitial(e.target.value)} />
              </label>
              <label>
                Latest live trees
                <input type="number" min="0" value={live} onChange={e => setLive(e.target.value)} />
              </label>
              <label>
                Average height (m)
                <input type="number" min="0" step=".1" value={avgHeight} onChange={e => setAvgHeight(e.target.value)} />
              </label>
              <label>
                Average DBH (cm)
                <input type="number" min="0" step=".1" value={avgDbh} onChange={e => setAvgDbh(e.target.value)} />
              </label>
              <label>
                Next action
                <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Weeding round 3" />
              </label>
              <label>
                Notes
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Free-text notes" />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" disabled={busy}>
                  {busy ? 'Saving…' : 'Save block'}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setFormError('');
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {formError && <p className="error">{formError}</p>}
        </section>

        {error && <p className="error">{error}</p>}

        <section className="panel">
          <h2>Blocks ({rows.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Location</th>
                  <th>Acres</th>
                  <th>Clone</th>
                  <th>Initial</th>
                  <th>Live</th>
                  <th>Survival</th>
                  <th>Growth</th>
                  <th>Next action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(x => {
                  const isEditing = editing === x._id;
                  return (
                    <tr key={x._id}>
                      <td>{x.blockId}</td>
                      <td>{x.location}</td>
                      <td>{x.areaAcres}</td>
                      <td>{x.cloneOrProvenance ?? '—'}</td>
                      <td>{x.initialTrees ?? '—'}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editState.latestLiveTrees}
                            onChange={e => setEditState({ ...editState, latestLiveTrees: e.target.value })}
                            style={{ width: 80 }}
                          />
                        ) : (
                          x.latestLiveTrees ?? '—'
                        )}
                      </td>
                      <td>{survivalDisplay(x)}</td>
                      <td>{x.growthSampleCount}</td>
                      <td>
                        {isEditing ? (
                          <input
                            value={editState.nextAction}
                            onChange={e => setEditState({ ...editState, nextAction: e.target.value })}
                            style={{ width: 160 }}
                          />
                        ) : (
                          x.nextAction ?? '—'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <>
                            <button className="btn" onClick={() => saveEdit(x._id)}>
                              Save
                            </button>{' '}
                            <button className="btn" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="btn" onClick={() => startEdit(x)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr style={{ fontWeight: 'bold' }}>
                    <td>Totals</td>
                    <td>{totals.blocks} blocks</td>
                    <td>{totals.areaAcres.toFixed(1)}</td>
                    <td>—</td>
                    <td>{totals.initialTreesRecorded}</td>
                    <td>{totals.liveTreesRecorded}</td>
                    <td>
                      {totals.initialTreesRecorded
                        ? ((100 * totals.liveTreesRecorded) / totals.initialTreesRecorded).toFixed(1) + '%'
                        : '—'}
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {totals && totals.blocksMissingTreeCounts > 0 && (
            <p className="muted">
              {totals.blocksMissingTreeCounts} block(s) missing tree counts — survival not computable.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}