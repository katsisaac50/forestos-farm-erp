'use client';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';

type Lot = {
  _id: string;
  lotCode: string;
  sourceType: string;
  blockId: string;
  harvestDate: string;
  commodityType: string;
  unit: string;
  quantity: number;
  originalQuantity: number;
  unitCostUgx: number;
  grade?: string;
  status: string;
};

type Sale = {
  _id: string;
  saleCode: string;
  lotId: string;
  saleDate: string;
  quantitySold: number;
  unitPriceUgx: number;
  totalRevenueUgx: number;
  costBasisUgx: number;
  grossMarginUgx: number;
  buyerName?: string;
  paymentStatus: string;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' UGX';

export default function HarvestIntakePage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    lotCode: '',
    sourceType: 'own_farm',
    blockId: '',
    harvestDate: new Date().toISOString().slice(0, 10),
    commodityType: 'timber',
    unit: 'm3',
    quantity: '',
    unitCostUgx: '',
    grade: '',
  });

  const [saleForm, setSaleForm] = useState({
    lotId: '',
    saleCode: '',
    saleDate: new Date().toISOString().slice(0, 10),
    quantitySold: '',
    unitPriceUgx: '',
    buyerName: '',
    paymentStatus: 'paid',
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [l, s] = await Promise.all([
        getData<Lot[]>('/harvest-intake/lots'),
        getData<Sale[]>('/harvest-intake/sales'),
      ]);
      setLots(l);
      setSales(s);
    } catch (e: any) {
      setError(e?.message || 'Could not load harvest data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await postData('/harvest-intake/lots', {
        ...form,
        quantity: Number(form.quantity),
        unitCostUgx: Number(form.unitCostUgx),
      });
      setForm({
        ...form,
        lotCode: '',
        blockId: '',
        quantity: '',
        unitCostUgx: '',
        grade: '',
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not create lot');
    }
  }

  async function createSale(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await postData('/harvest-intake/sales', {
        ...saleForm,
        quantitySold: Number(saleForm.quantitySold),
        unitPriceUgx: Number(saleForm.unitPriceUgx),
      });
      setSaleForm({
        ...saleForm,
        saleCode: '',
        quantitySold: '',
        unitPriceUgx: '',
        buyerName: '',
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not record sale');
    }
  }

  const totalRevenue = sales.reduce((s, x) => s + x.totalRevenueUgx, 0);
  const totalCogs = sales.reduce((s, x) => s + x.costBasisUgx, 0);
  const totalMargin = sales.reduce((s, x) => s + x.grossMarginUgx, 0);
  const availableLots = lots.filter(l => l.status !== 'sold_out');
  const lotById = new Map(lots.map(l => [l._id, l]));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Harvest intake &amp; lots</h1>
        <p className="text-sm text-gray-600">
          Record harvested timber/honey as inventory lots. Every intake and sale posts to the general ledger automatically.
        </p>
      </header>

      {error && <div className="rounded-lg border border-red-400 bg-red-50 p-3 text-red-800">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Total revenue</div>
          <div className="text-lg font-bold">{money(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Total COGS</div>
          <div className="text-lg font-bold">{money(totalCogs)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Gross margin</div>
          <div className={`text-lg font-bold ${totalMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {money(totalMargin)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={createLot} className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-bold">Record harvest intake</h2>
          <div className="grid gap-3 grid-cols-2">
            <label className="text-sm">
              Lot code
              <input
                value={form.lotCode}
                onChange={e => setForm({ ...form, lotCode: e.target.value })}
                required
                placeholder="LOT-2026-001"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              Source
              <select
                value={form.sourceType}
                onChange={e => setForm({ ...form, sourceType: e.target.value })}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="own_farm">Own farm</option>
                <option value="grower">Grower</option>
              </select>
            </label>
            <label className="text-sm">
              Block
              <input
                value={form.blockId}
                onChange={e => setForm({ ...form, blockId: e.target.value })}
                required
                placeholder="BLK-001"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              Harvest date
              <input
                type="date"
                value={form.harvestDate}
                onChange={e => setForm({ ...form, harvestDate: e.target.value })}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              Commodity
              <select
                value={form.commodityType}
                onChange={e => setForm({ ...form, commodityType: e.target.value })}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="timber">Timber</option>
                <option value="honey">Honey</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm">
              Unit
              <input
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              Quantity
              <input
                type="number"
                min="0.001"
                step="any"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              Unit cost (UGX)
              <input
                type="number"
                min="0"
                step="any"
                value={form.unitCostUgx}
                onChange={e => setForm({ ...form, unitCostUgx: e.target.value })}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm col-span-2">
              Grade
              <input
                value={form.grade}
                onChange={e => setForm({ ...form, grade: e.target.value })}
                placeholder="Grade A, Grade B, etc."
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          </div>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
            Create lot + post to GL
          </button>
        </form>

        <form onSubmit={createSale} className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-bold">Record lot sale</h2>
          {availableLots.length === 0 ? (
            <p className="text-sm text-gray-500">Create a harvest lot first.</p>
          ) : (
            <>
              <label className="text-sm block">
                Lot
                <select
                  value={saleForm.lotId}
                  onChange={e => setSaleForm({ ...saleForm, lotId: e.target.value })}
                  required
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="">Select lot</option>
                  {availableLots.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.lotCode} — {l.quantity} {l.unit} @ {money(l.unitCostUgx)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 grid-cols-2">
                <label className="text-sm">
                  Sale code
                  <input
                    value={saleForm.saleCode}
                    onChange={e => setSaleForm({ ...saleForm, saleCode: e.target.value })}
                    required
                    placeholder="SALE-001"
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Sale date
                  <input
                    type="date"
                    value={saleForm.saleDate}
                    onChange={e => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                    required
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Quantity sold
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={saleForm.quantitySold}
                    onChange={e => setSaleForm({ ...saleForm, quantitySold: e.target.value })}
                    required
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Unit price (UGX)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={saleForm.unitPriceUgx}
                    onChange={e => setSaleForm({ ...saleForm, unitPriceUgx: e.target.value })}
                    required
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Buyer
                  <input
                    value={saleForm.buyerName}
                    onChange={e => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="text-sm">
                  Payment status
                  <select
                    value={saleForm.paymentStatus}
                    onChange={e => setSaleForm({ ...saleForm, paymentStatus: e.target.value })}
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending (AR)</option>
                    <option value="partial">Partial</option>
                  </select>
                </label>
              </div>
              <button className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
                Record sale + post to GL
              </button>
            </>
          )}
        </form>
      </div>

      <section className="rounded-xl border bg-white">
        <h2 className="border-b p-4 text-lg font-bold">Harvest lots</h2>
        {loading ? (
          <p className="p-6 text-center text-gray-500">Loading…</p>
        ) : lots.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No lots yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Block</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3 text-right">Unit cost</th>
                <th className="p-3 text-right">Book value</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {lots.map(l => (
                <tr key={l._id} className="border-b">
                  <td className="p-3"><code className="text-xs">{l.lotCode}</code></td>
                  <td className="p-3">{l.sourceType.replace('_', ' ')}</td>
                  <td className="p-3">{l.blockId}</td>
                  <td className="p-3 text-xs">{new Date(l.harvestDate).toLocaleDateString()}</td>
                  <td className="p-3 text-right">{l.quantity} {l.unit}</td>
                  <td className="p-3 text-right">{money(l.unitCostUgx)}</td>
                  <td className="p-3 text-right font-medium">{money(l.quantity * l.unitCostUgx)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      l.status === 'sold_out' ? 'bg-gray-200 text-gray-700' :
                      l.status === 'partially_sold' ? 'bg-orange-100 text-orange-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border bg-white">
        <h2 className="border-b p-4 text-lg font-bold">Lot sales</h2>
        {sales.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No sales recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3 text-left">Sale</th>
                <th className="p-3 text-left">Lot</th>
                <th className="p-3 text-left">Buyer</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">COGS</th>
                <th className="p-3 text-right">Margin</th>
                <th className="p-3 text-left">Payment</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => {
                const lot = lotById.get(s.lotId);
                return (
                  <tr key={s._id} className="border-b">
                    <td className="p-3"><code className="text-xs">{s.saleCode}</code></td>
                    <td className="p-3">{lot?.lotCode ?? '—'}</td>
                    <td className="p-3">{s.buyerName ?? '—'}</td>
                    <td className="p-3 text-right">{s.quantitySold} {lot?.unit ?? ''}</td>
                    <td className="p-3 text-right">{money(s.totalRevenueUgx)}</td>
                    <td className="p-3 text-right">{money(s.costBasisUgx)}</td>
                    <td className={`p-3 text-right font-medium ${s.grossMarginUgx >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {money(s.grossMarginUgx)}
                    </td>
                    <td className="p-3">{s.paymentStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}