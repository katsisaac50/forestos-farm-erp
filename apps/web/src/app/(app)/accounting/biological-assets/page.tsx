'use client';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';

type Asset = {
  _id: string;
  blockId: string;
  plantedDate: string;
  areaAcres: number;
  species: string;
  costBasisUgx: number;
  fairValueUgx: number;
  estimatedVolume: number;
  volumeUnit: string;
  fairValuePerUnitUgx: number;
  lastValuationDate?: string;
};

type Valuation = {
  _id: string;
  blockId: string;
  valuationDate: string;
  previousFairValueUgx: number;
  newFairValueUgx: number;
  gainLossUgx: number;
  estimatedVolume: number;
  volumeUnit: string;
  fairValuePerUnitUgx: number;
  valuationMethod: string;
  notes?: string;
  createdAt: string;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' UGX';

export default function BiologicalAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'register' | 'revalue'>('register');

  const [createForm, setCreateForm] = useState({
    blockId: '',
    plantedDate: new Date().toISOString().slice(0, 10),
    areaAcres: '',
    species: 'Eucalyptus grandis',
    costBasisUgx: '',
    estimatedVolume: '',
    volumeUnit: 'm3',
    fairValuePerUnitUgx: '',
  });

  const [revalForm, setRevalForm] = useState({
    blockId: '',
    valuationDate: new Date().toISOString().slice(0, 10),
    estimatedVolume: '',
    fairValuePerUnitUgx: '',
    valuationMethod: 'market',
    notes: '',
  });

  async function load() {
    setLoading(true); setError('');
    try {
      const [a, v] = await Promise.all([
        getData<Asset[]>('/biological-assets'),
        getData<Valuation[]>('/biological-assets/valuations'),
      ]);
      setAssets(a); setValuations(v);
    } catch (e: any) {
      setError(e?.message || 'Could not load biological assets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await postData('/biological-assets', {
        ...createForm,
        areaAcres: Number(createForm.areaAcres),
        costBasisUgx: Number(createForm.costBasisUgx),
        estimatedVolume: Number(createForm.estimatedVolume),
        fairValuePerUnitUgx: Number(createForm.fairValuePerUnitUgx),
      });
      setCreateForm({ ...createForm, blockId: '', areaAcres: '', costBasisUgx: '', estimatedVolume: '', fairValuePerUnitUgx: '' });
      await load();
    } catch (e: any) { setError(e?.message || 'Could not create asset'); }
  }

  async function revalue(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await postData('/biological-assets/revalue', {
        ...revalForm,
        estimatedVolume: Number(revalForm.estimatedVolume),
        fairValuePerUnitUgx: Number(revalForm.fairValuePerUnitUgx),
      });
      setRevalForm({ ...revalForm, blockId: '', estimatedVolume: '', fairValuePerUnitUgx: '', notes: '' });
      await load();
    } catch (e: any) { setError(e?.message || 'Could not post revaluation'); }
  }

  const totalFairValue = assets.reduce((s, a) => s + a.fairValueUgx, 0);
  const totalCostBasis = assets.reduce((s, a) => s + a.costBasisUgx, 0);
  const unrealisedGain = totalFairValue - totalCostBasis;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Biological assets</h1>
        <p className="text-sm text-gray-600">Trees and bee colonies on the balance sheet. Revaluations post to the general ledger per IAS 41.</p>
      </header>

      {error && <div className="rounded-lg border border-red-400 bg-red-50 p-3 text-red-800">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Total fair value</div>
          <div className="text-lg font-bold">{money(totalFairValue)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Capitalised cost</div>
          <div className="text-lg font-bold">{money(totalCostBasis)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Unrealised gain</div>
          <div className={`text-lg font-bold ${unrealisedGain >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(unrealisedGain)}</div>
        </div>
      </div>

      <nav className="flex gap-1 border-b">
        <button onClick={() => setTab('register')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'register' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600'}`}>
          Register
        </button>
        <button onClick={() => setTab('revalue')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'revalue' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600'}`}>
          Revalue
        </button>
      </nav>

      {tab === 'register' && (
        <form onSubmit={createAsset} className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-bold">Add biological asset</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Block ID<input value={createForm.blockId} onChange={e => setCreateForm({ ...createForm, blockId: e.target.value })} required placeholder="BLK-002" className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Planted date<input type="date" value={createForm.plantedDate} onChange={e => setCreateForm({ ...createForm, plantedDate: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Area (acres)<input type="number" min="0" step="any" value={createForm.areaAcres} onChange={e => setCreateForm({ ...createForm, areaAcres: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Species<input value={createForm.species} onChange={e => setCreateForm({ ...createForm, species: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Cost basis (UGX)<input type="number" min="0" step="any" value={createForm.costBasisUgx} onChange={e => setCreateForm({ ...createForm, costBasisUgx: e.target.value })} required placeholder="Establishment costs" className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Estimated volume<input type="number" min="0" step="any" value={createForm.estimatedVolume} onChange={e => setCreateForm({ ...createForm, estimatedVolume: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Volume unit<input value={createForm.volumeUnit} onChange={e => setCreateForm({ ...createForm, volumeUnit: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Fair value per unit (UGX)<input type="number" min="0" step="any" value={createForm.fairValuePerUnitUgx} onChange={e => setCreateForm({ ...createForm, fairValuePerUnitUgx: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
          </div>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">Capitalise + post to GL</button>
        </form>
      )}

      {tab === 'revalue' && (
        <form onSubmit={revalue} className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-bold">Post revaluation</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm col-span-2">Block<select value={revalForm.blockId} onChange={e => setRevalForm({ ...revalForm, blockId: e.target.value })} required className="mt-1 w-full rounded border p-2">
              <option value="">Select block</option>
              {assets.map(a => <option key={a._id} value={a.blockId}>{a.blockId} — {a.species} — current {money(a.fairValueUgx)}</option>)}
            </select></label>
            <label className="text-sm">Valuation date<input type="date" value={revalForm.valuationDate} onChange={e => setRevalForm({ ...revalForm, valuationDate: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">New estimated volume<input type="number" min="0" step="any" value={revalForm.estimatedVolume} onChange={e => setRevalForm({ ...revalForm, estimatedVolume: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">New fair value per unit (UGX)<input type="number" min="0" step="any" value={revalForm.fairValuePerUnitUgx} onChange={e => setRevalForm({ ...revalForm, fairValuePerUnitUgx: e.target.value })} required className="mt-1 w-full rounded border p-2" /></label>
            <label className="text-sm">Method<select value={revalForm.valuationMethod} onChange={e => setRevalForm({ ...revalForm, valuationMethod: e.target.value })} className="mt-1 w-full rounded border p-2">
              <option value="market">Market comparison</option>
              <option value="cost">Cost</option>
              <option value="income">Income (DCF)</option>
            </select></label>
            <label className="text-sm col-span-2">Notes<textarea value={revalForm.notes} onChange={e => setRevalForm({ ...revalForm, notes: e.target.value })} placeholder="Assumptions, market source, measurement basis" className="mt-1 w-full rounded border p-2" /></label>
          </div>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">Post revaluation to GL</button>
        </form>
      )}

      <section className="rounded-xl border bg-white">
        <h2 className="border-b p-4 text-lg font-bold">Assets</h2>
        {loading ? <p className="p-6 text-center text-gray-500">Loading…</p> :
         assets.length === 0 ? <p className="p-6 text-center text-gray-500">No biological assets yet.</p> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50"><tr>
              <th className="p-3 text-left">Block</th>
              <th className="p-3 text-left">Species</th>
              <th className="p-3 text-right">Area</th>
              <th className="p-3 text-right">Volume</th>
              <th className="p-3 text-right">Fair value</th>
              <th className="p-3 text-right">Cost basis</th>
              <th className="p-3 text-right">Gain</th>
              <th className="p-3 text-left">Last valuation</th>
            </tr></thead>
            <tbody>{assets.map(a => {
              const gain = a.fairValueUgx - a.costBasisUgx;
              return <tr key={a._id} className="border-b">
                <td className="p-3"><code className="text-xs">{a.blockId}</code></td>
                <td className="p-3">{a.species}</td>
                <td className="p-3 text-right">{a.areaAcres} ac</td>
                <td className="p-3 text-right">{a.estimatedVolume} {a.volumeUnit}</td>
                <td className="p-3 text-right font-medium">{money(a.fairValueUgx)}</td>
                <td className="p-3 text-right">{money(a.costBasisUgx)}</td>
                <td className={`p-3 text-right font-medium ${gain >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(gain)}</td>
                <td className="p-3 text-xs">{a.lastValuationDate ? new Date(a.lastValuationDate).toLocaleDateString() : '—'}</td>
              </tr>;
            })}</tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border bg-white">
        <h2 className="border-b p-4 text-lg font-bold">Valuation history</h2>
        {valuations.length === 0 ? <p className="p-6 text-center text-gray-500">No valuations yet.</p> : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50"><tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Block</th>
              <th className="p-3 text-right">Previous</th>
              <th className="p-3 text-right">New</th>
              <th className="p-3 text-right">Gain/Loss</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Notes</th>
            </tr></thead>
            <tbody>{valuations.map(v => (
              <tr key={v._id} className="border-b">
                <td className="p-3 text-xs">{new Date(v.valuationDate).toLocaleDateString()}</td>
                <td className="p-3"><code className="text-xs">{v.blockId}</code></td>
                <td className="p-3 text-right">{money(v.previousFairValueUgx)}</td>
                <td className="p-3 text-right">{money(v.newFairValueUgx)}</td>
                <td className={`p-3 text-right font-medium ${v.gainLossUgx >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(v.gainLossUgx)}</td>
                <td className="p-3 text-xs">{v.valuationMethod}</td>
                <td className="p-3 text-xs">{v.notes ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}