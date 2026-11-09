'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';
import {
  MetricCard,
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
type CashPosition = {
  _id: string;
  asOfDate: string;
  openingCashUgx: number;
  note: string;
  recordedBy?: string;
  createdAt?: string;
};

type PlanCategory = 'inflow' | 'outflow' | 'reserve' | 'investment';
type PlanConfidence = 'low' | 'medium' | 'high';
type PlanStatus = 'planned' | 'committed' | 'completed' | 'cancelled';

type CashflowPlan = {
  _id: string;
  planCode: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  category: PlanCategory;
  plannedAmountUgx: number;
  confidence: PlanConfidence;
  relatedBusinessLine?: string;
  note?: string;
  status: PlanStatus;
  createdBy?: string;
};

type DecisionStatus = 'draft' | 'approved' | 'executed' | 'rejected';

type CapitalDecision = {
  _id: string;
  decisionCode: string;
  decisionDate: string;
  purpose: string;
  destination: string;
  proposedAmountUgx: number;
  protectedReserveUgx: number;
  cashAvailableUgx: number;
  otherCommittedUgx: number;
  rationale: string;
  status: DecisionStatus;
  investableCashAtEntryUgx?: number;
  withinEnteredCashLimit?: boolean;
  recordedBy?: string;
};

type Dashboard = {
  latestCashPosition: CashPosition | null;
  plans: CashflowPlan[];
  decisions: CapitalDecision[];
  totals: {
    plannedInflowsUgx: number;
    plannedOutflowsUgx: number;
    plannedReservesUgx: number;
    plannedInvestmentsUgx: number;
    netPlannedMovementUgx: number;
  };
  capitalDecisionSummary: {
    draftOrApprovedCount: number;
    proposedAmountUgx: number;
  };
  warning: string;
};

// ---- Form state ----
type PositionForm = { asOfDate: string; openingCashUgx: string; note: string };
type PlanForm = {
  planCode: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  category: PlanCategory;
  plannedAmountUgx: string;
  confidence: PlanConfidence;
  relatedBusinessLine: string;
  note: string;
  status: PlanStatus;
};
type DecisionForm = {
  decisionCode: string;
  decisionDate: string;
  purpose: string;
  destination: string;
  proposedAmountUgx: string;
  protectedReserveUgx: string;
  cashAvailableUgx: string;
  otherCommittedUgx: string;
  rationale: string;
  status: DecisionStatus;
};

const today = new Date().toISOString().slice(0, 10);

const blankPosition = (): PositionForm => ({
  asOfDate: today,
  openingCashUgx: '',
  note: '',
});

const blankPlan = (): PlanForm => ({
  planCode: '',
  title: '',
  periodStart: today,
  periodEnd: today,
  category: 'outflow',
  plannedAmountUgx: '',
  confidence: 'medium',
  relatedBusinessLine: 'eucalyptus',
  note: '',
  status: 'planned',
});

const blankDecision = (): DecisionForm => ({
  decisionCode: '',
  decisionDate: today,
  purpose: '',
  destination: 'eucalyptus',
  proposedAmountUgx: '',
  protectedReserveUgx: '',
  cashAvailableUgx: '',
  otherCommittedUgx: '',
  rationale: '',
  status: 'draft',
});

const money = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);

const categoryTone = (c: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' => {
  switch (c) {
    case 'inflow': return 'ok';
    case 'outflow': return 'danger';
    case 'reserve': return 'warn';
    case 'investment': return 'info';
    default: return 'neutral';
  }
};

const statusTone = (s: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' => {
  switch (s) {
    case 'completed':
    case 'executed':
      return 'ok';
    case 'cancelled':
    case 'rejected':
      return 'danger';
    case 'committed':
    case 'approved':
      return 'warn';
    case 'planned':
    case 'draft':
      return 'info';
    default: return 'neutral';
  }
};

const label = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function CashflowPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [positionForm, setPositionForm] = useState<PositionForm>(blankPosition());
  const [planForm, setPlanForm] = useState<PlanForm>(blankPlan());
  const [decisionForm, setDecisionForm] = useState<DecisionForm>(blankDecision());

  const [positionOpen, setPositionOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);

  const [planCategoryFilter, setPlanCategoryFilter] = useState<'all' | PlanCategory>('all');
  const [planStatusFilter, setPlanStatusFilter] = useState<'all' | PlanStatus>('all');
  const [decisionStatusFilter, setDecisionStatusFilter] = useState<'all' | DecisionStatus>('all');

  async function load() {
    try {
      const d = await getData<Dashboard>('/cashflow/dashboard');
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load cash flow planning');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function savePosition(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await postData('/cashflow/positions', {
        asOfDate: positionForm.asOfDate,
        openingCashUgx: Number(positionForm.openingCashUgx),
        note: positionForm.note.trim(),
      });
      setNotice('Cash snapshot saved. Reconcile it against bank, cash and pending transactions.');
      setPositionForm(blankPosition());
      setPositionOpen(false);
      await load();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save cash snapshot');
    } finally {
      setBusy(false);
    }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await postData('/cashflow/plans', {
        planCode: planForm.planCode.trim(),
        title: planForm.title.trim(),
        periodStart: planForm.periodStart,
        periodEnd: planForm.periodEnd,
        category: planForm.category,
        plannedAmountUgx: Number(planForm.plannedAmountUgx),
        confidence: planForm.confidence,
        relatedBusinessLine: planForm.relatedBusinessLine,
        note: planForm.note.trim() || undefined,
        status: planForm.status,
      });
      setNotice('Cash flow plan saved.');
      setPlanForm(blankPlan());
      setPlanOpen(false);
      await load();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save cash flow plan');
    } finally {
      setBusy(false);
    }
  }

  async function saveDecision(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const r = await postData<{ investableCashAtEntryUgx: number; withinEnteredCashLimit: boolean }>(
        '/cashflow/decisions',
        {
          decisionCode: decisionForm.decisionCode.trim(),
          decisionDate: decisionForm.decisionDate,
          purpose: decisionForm.purpose.trim(),
          destination: decisionForm.destination,
          proposedAmountUgx: Number(decisionForm.proposedAmountUgx),
          protectedReserveUgx: Number(decisionForm.protectedReserveUgx),
          cashAvailableUgx: Number(decisionForm.cashAvailableUgx),
          otherCommittedUgx: Number(decisionForm.otherCommittedUgx),
          rationale: decisionForm.rationale.trim(),
          status: decisionForm.status,
        }
      );
      setNotice(
        `Decision saved as ${decisionForm.status}. Investable cash after entered reserve and commitments: ${money(
          r.investableCashAtEntryUgx
        )}. Proposed amount ${r.withinEnteredCashLimit ? 'is within' : 'exceeds'} that limit.`
      );
      setDecisionForm(blankDecision());
      setDecisionOpen(false);
      await load();
      setTimeout(() => setNotice(''), 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save capital decision');
    } finally {
      setBusy(false);
    }
  }

  function updatePosition<K extends keyof PositionForm>(key: K, value: PositionForm[K]) {
    setPositionForm(prev => ({ ...prev, [key]: value }));
  }
  function updatePlan<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setPlanForm(prev => ({ ...prev, [key]: value }));
  }
  function updateDecision<K extends keyof DecisionForm>(key: K, value: DecisionForm[K]) {
    setDecisionForm(prev => ({ ...prev, [key]: value }));
  }

  const totals = data?.totals;
  const latest = data?.latestCashPosition;

  const visiblePlans = (data?.plans ?? []).filter(p => {
    if (planCategoryFilter !== 'all' && p.category !== planCategoryFilter) return false;
    if (planStatusFilter !== 'all' && p.status !== planStatusFilter) return false;
    return true;
  });

  const visibleDecisions = (data?.decisions ?? []).filter(d => {
    if (decisionStatusFilter !== 'all' && d.status !== decisionStatusFilter) return false;
    return true;
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/finance', 'Finance'],
            ['/cashflow', 'Cash flow & capital'],
            ['/investment', 'Investment analysis'],
            ['/cost-intelligence', 'Cost intelligence'],
            ['/financial-investigation-cases', 'Investigation cases'],
            ['/capital-allocation', 'Capital allocation'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Cash flow &amp; capital allocation</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Liquidity planning, reserves, and disciplined reinvestment · UGX
        </p>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}

        {data?.warning && (
          <p
            className="panel"
            style={{
              borderLeft: '4px solid #f59e0b',
              backgroundColor: '#fffbeb',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠️ {data.warning}
          </p>
        )}

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MetricCard
            label="Latest cash snapshot"
            value={money(latest?.openingCashUgx)}
            detail={latest ? `As of ${latest.asOfDate}` : 'No snapshot recorded'}
            tone={latest ? 'neutral' : 'warn'}
          />
          <MetricCard
            label="Planned inflows"
            value={money(totals?.plannedInflowsUgx)}
            detail="Not yet received"
            tone={totals && totals.plannedInflowsUgx > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            label="Planned outflows"
            value={money(totals?.plannedOutflowsUgx)}
            detail={`+ Reserves ${money(totals?.plannedReservesUgx)} · Investments ${money(totals?.plannedInvestmentsUgx)}`}
            tone={totals && totals.plannedOutflowsUgx > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Net planned movement"
            value={money(totals?.netPlannedMovementUgx)}
            detail="Inflows minus outflows, reserves & investments"
            tone={
              totals
                ? totals.netPlannedMovementUgx >= 0
                  ? 'success'
                  : 'danger'
                : 'neutral'
            }
          />
        </div>

        {/* Cash decision summary banner */}
        {data && data.capitalDecisionSummary.draftOrApprovedCount > 0 && (
          <section
            className="panel"
            style={{
              marginBottom: 16,
              borderLeft: '4px solid #3b82f6',
              backgroundColor: '#eff6ff',
              fontSize: 14,
            }}
          >
            <strong>{data.capitalDecisionSummary.draftOrApprovedCount} capital decision{data.capitalDecisionSummary.draftOrApprovedCount === 1 ? '' : 's'}</strong>{' '}
            pending execution · total proposed {money(data.capitalDecisionSummary.proposedAmountUgx)}.
            Decisions are not automatically approved or funded.
          </section>
        )}

        {/* Step 1: Cash snapshot */}
        <CollapsibleSection
          title="1. Record a reconciled cash snapshot"
          open={positionOpen}
          onToggle={() => setPositionOpen(o => !o)}
          actionLabel="+ Cash snapshot"
        >
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Enter cash available as of a date only after checking bank accounts, cash
            holdings, and outstanding/pending transactions. A new snapshot does not
            automatically roll forward from the previous one.
          </p>
          <form onSubmit={savePosition}>
            <FormSection title="Snapshot details">
              <label>
                As-of date *
                <input
                  type="date"
                  value={positionForm.asOfDate}
                  onChange={e => updatePosition('asOfDate', e.target.value)}
                  required
                />
              </label>
              <label>
                Reconciled cash available (UGX) *
                <input
                  type="number"
                  min={0}
                  value={positionForm.openingCashUgx}
                  onChange={e => updatePosition('openingCashUgx', e.target.value)}
                  required
                />
              </label>
            </FormSection>
            <label style={{ display: 'block', marginTop: 16 }}>
              Reconciliation note *
              <textarea
                value={positionForm.note}
                onChange={e => updatePosition('note', e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Accounts checked, cash on hand, uncleared payments and exclusions…"
                required
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save cash snapshot'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPositionOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Step 2: Plan */}
        <CollapsibleSection
          title="2. Add a cash flow plan"
          open={planOpen}
          onToggle={() => setPlanOpen(o => !o)}
          actionLabel="+ Cash flow plan"
        >
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Record expected inflows, outflows, reserve contributions, or investments. These
            are manual planning entries and are not automatically confirmed as received or
            paid.
          </p>
          <form onSubmit={savePlan}>
            <FormSection title="Plan details">
              <label>
                Plan code *
                <input
                  value={planForm.planCode}
                  onChange={e => updatePlan('planCode', e.target.value)}
                  placeholder="CF-2026-001"
                  required
                />
              </label>
              <label>
                Title *
                <input
                  value={planForm.title}
                  onChange={e => updatePlan('title', e.target.value)}
                  placeholder="Firebreak maintenance"
                  required
                />
              </label>
              <label>
                Period start *
                <input
                  type="date"
                  value={planForm.periodStart}
                  onChange={e => updatePlan('periodStart', e.target.value)}
                  required
                />
              </label>
              <label>
                Period end *
                <input
                  type="date"
                  value={planForm.periodEnd}
                  onChange={e => updatePlan('periodEnd', e.target.value)}
                  required
                />
              </label>
            </FormSection>
            <FormSection title="Category & amount">
              <label>
                Category *
                <select
                  value={planForm.category}
                  onChange={e => updatePlan('category', e.target.value as PlanCategory)}
                >
                  <option value="inflow">Inflow</option>
                  <option value="outflow">Outflow</option>
                  <option value="reserve">Reserve</option>
                  <option value="investment">Investment</option>
                </select>
              </label>
              <label>
                Amount (UGX) *
                <input
                  type="number"
                  min={0}
                  value={planForm.plannedAmountUgx}
                  onChange={e => updatePlan('plannedAmountUgx', e.target.value)}
                  required
                />
              </label>
              <label>
                Confidence
                <select
                  value={planForm.confidence}
                  onChange={e => updatePlan('confidence', e.target.value as PlanConfidence)}
                >
                  <option value="low">Low / uncertain</option>
                  <option value="medium">Medium</option>
                  <option value="high">High / supported</option>
                </select>
              </label>
              <label>
                Business line
                <select
                  value={planForm.relatedBusinessLine}
                  onChange={e => updatePlan('relatedBusinessLine', e.target.value)}
                >
                  <option value="eucalyptus">Eucalyptus</option>
                  <option value="beekeeping">Beekeeping</option>
                  <option value="shared">Shared farm</option>
                  <option value="personal">Personal / founder contribution</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={planForm.status}
                  onChange={e => updatePlan('status', e.target.value as PlanStatus)}
                >
                  <option value="planned">Planned</option>
                  <option value="committed">Committed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </FormSection>
            <label style={{ display: 'block', marginTop: 16 }}>
              Notes / assumptions
              <textarea
                value={planForm.note}
                onChange={e => updatePlan('note', e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save cash flow plan'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setPlanOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Step 3: Capital decision */}
        <CollapsibleSection
          title="3. Evaluate a capital allocation"
          open={decisionOpen}
          onToggle={() => setDecisionOpen(o => !o)}
          actionLabel="+ Capital decision"
        >
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Decision worksheet. Enter current reconciled cash, protected reserve, and other
            commitments. The calculation is a point-in-time check — not a guarantee that
            funds remain available.
          </p>
          <form onSubmit={saveDecision}>
            <FormSection title="Decision identity">
              <label>
                Decision code *
                <input
                  value={decisionForm.decisionCode}
                  onChange={e => updateDecision('decisionCode', e.target.value)}
                  placeholder="CAP-2026-001"
                  required
                />
              </label>
              <label>
                Date *
                <input
                  type="date"
                  value={decisionForm.decisionDate}
                  onChange={e => updateDecision('decisionDate', e.target.value)}
                  required
                />
              </label>
              <label>
                Purpose *
                <input
                  value={decisionForm.purpose}
                  onChange={e => updateDecision('purpose', e.target.value)}
                  placeholder="Buy seedlings / add hives"
                  required
                />
              </label>
              <label>
                Destination
                <select
                  value={decisionForm.destination}
                  onChange={e => updateDecision('destination', e.target.value)}
                >
                  <option value="eucalyptus">Eucalyptus</option>
                  <option value="beekeeping">Beekeeping</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="working_capital">Working capital</option>
                  <option value="reserve">Reserve</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </FormSection>
            <FormSection title="Amounts (UGX)">
              <label>
                Proposed amount *
                <input
                  type="number"
                  min={0}
                  value={decisionForm.proposedAmountUgx}
                  onChange={e => updateDecision('proposedAmountUgx', e.target.value)}
                  required
                />
              </label>
              <label>
                Reconciled available cash *
                <input
                  type="number"
                  min={0}
                  value={decisionForm.cashAvailableUgx}
                  onChange={e => updateDecision('cashAvailableUgx', e.target.value)}
                  required
                />
              </label>
              <label>
                Protected reserve *
                <input
                  type="number"
                  min={0}
                  value={decisionForm.protectedReserveUgx}
                  onChange={e => updateDecision('protectedReserveUgx', e.target.value)}
                  required
                />
              </label>
              <label>
                Other committed costs *
                <input
                  type="number"
                  min={0}
                  value={decisionForm.otherCommittedUgx}
                  onChange={e => updateDecision('otherCommittedUgx', e.target.value)}
                  required
                />
              </label>
              <label>
                Status
                <select
                  value={decisionForm.status}
                  onChange={e => updateDecision('status', e.target.value as DecisionStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="executed">Executed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </FormSection>
            <label style={{ display: 'block', marginTop: 16 }}>
              Rationale / expected benefit / risks *
              <textarea
                value={decisionForm.rationale}
                onChange={e => updateDecision('rationale', e.target.value)}
                rows={3}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Why now? What evidence supports the return? What could go wrong?"
                required
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save decision'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setDecisionOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Plans table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Cash flow plans</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visiblePlans.length} of {data?.plans.length ?? 0}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span className="muted">Category</span>
              <select
                value={planCategoryFilter}
                onChange={e => setPlanCategoryFilter(e.target.value as typeof planCategoryFilter)}
                style={{ width: 'auto' }}
              >
                <option value="all">All</option>
                <option value="inflow">Inflow</option>
                <option value="outflow">Outflow</option>
                <option value="reserve">Reserve</option>
                <option value="investment">Investment</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span className="muted">Status</span>
              <select
                value={planStatusFilter}
                onChange={e => setPlanStatusFilter(e.target.value as typeof planStatusFilter)}
                style={{ width: 'auto' }}
              >
                <option value="all">All</option>
                <option value="planned">Planned</option>
                <option value="committed">Committed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {visiblePlans.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {data?.plans.length === 0
                ? 'No cash flow plans recorded yet. Click + Cash flow plan to add one.'
                : 'No plans match the current filters.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Code / Title</th>
                    <th style={thLeft}>Period</th>
                    <th style={thLeft}>Category</th>
                    <th style={thRight}>Amount (UGX)</th>
                    <th style={thLeft}>Confidence</th>
                    <th style={thLeft}>Business line</th>
                    <th style={thLeft}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlans.map(p => (
                    <tr key={p._id} style={bodyRow}>
                      <td style={tdLeft}>
                        <div style={{ ...mono, fontWeight: 600 }}>{p.planCode}</div>
                        <div>{p.title}</div>
                        {p.note && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {p.note}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {p.periodStart} — {p.periodEnd}
                      </td>
                      <td style={tdLeft}>
                        <Badge label={label(p.category)} tone={categoryTone(p.category)} />
                      </td>
                      <td style={tdRight}>{money(p.plannedAmountUgx)}</td>
                      <td style={tdLeft}>{label(p.confidence)}</td>
                      <td style={tdLeft}>{p.relatedBusinessLine ?? '—'}</td>
                      <td style={tdLeft}>
                        <Badge label={label(p.status)} tone={statusTone(p.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Decisions table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Capital allocation decisions</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleDecisions.length} of {data?.decisions.length ?? 0}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span className="muted">Status</span>
              <select
                value={decisionStatusFilter}
                onChange={e => setDecisionStatusFilter(e.target.value as typeof decisionStatusFilter)}
                style={{ width: 'auto' }}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="executed">Executed</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>

          {visibleDecisions.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {data?.decisions.length === 0
                ? 'No capital decisions recorded yet. Click + Capital decision to add one.'
                : 'No decisions match the current filter.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Code / Purpose</th>
                    <th style={thLeft}>Destination</th>
                    <th style={thRight}>Proposed</th>
                    <th style={thRight}>Reserve</th>
                    <th style={thRight}>Cash entered</th>
                    <th style={thRight}>Other committed</th>
                    <th style={thRight}>Investable at entry</th>
                    <th style={thLeft}>Within limit</th>
                    <th style={thLeft}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDecisions.map(d => {
                    const investable =
                      d.investableCashAtEntryUgx ??
                      Math.max(0, d.cashAvailableUgx - d.protectedReserveUgx - d.otherCommittedUgx);
                    const within =
                      d.withinEnteredCashLimit !== undefined
                        ? d.withinEnteredCashLimit
                        : d.proposedAmountUgx <= investable;
                    return (
                      <tr key={d._id} style={bodyRow}>
                        <td style={tdLeft}>
                          <div style={{ ...mono, fontWeight: 600 }}>{d.decisionCode}</div>
                          <div>{d.purpose}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {d.rationale}
                          </div>
                        </td>
                        <td style={tdLeft}>{label(d.destination)}</td>
                        <td style={tdRight}>{money(d.proposedAmountUgx)}</td>
                        <td style={tdRight}>{money(d.protectedReserveUgx)}</td>
                        <td style={tdRight}>{money(d.cashAvailableUgx)}</td>
                        <td style={tdRight}>{money(d.otherCommittedUgx)}</td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>{money(investable)}</td>
                        <td style={tdLeft}>
                          {within ? (
                            <Badge label="Within" tone="ok" />
                          ) : (
                            <Badge label="Exceeds" tone="danger" />
                          )}
                        </td>
                        <td style={tdLeft}>
                          <Badge label={label(d.status)} tone={statusTone(d.status)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Callout title="Capital discipline rules">
          <ol style={{ margin: '0 0 0 20px', padding: 0 }}>
            <li style={{ marginBottom: 4 }}>
              Reconcile the cash figure before making an investment decision.
            </li>
            <li style={{ marginBottom: 4 }}>
              Protect operating cash and an emergency reserve before discretionary
              reinvestment.
            </li>
            <li style={{ marginBottom: 4 }}>
              List known obligations and committed costs before allocating capital.
            </li>
            <li style={{ marginBottom: 4 }}>
              Prefer investments with measurable costs, risks, milestones and expected cash
              generation.
            </li>
            <li style={{ marginBottom: 4 }}>
              Do not treat projected timber proceeds or honey sales as available cash until
              received.
            </li>
            <li>
              Use the same cost only once across finance and management registers; reconcile
              records regularly.
            </li>
          </ol>
        </Callout>
      </main>
    </div>
  );
}