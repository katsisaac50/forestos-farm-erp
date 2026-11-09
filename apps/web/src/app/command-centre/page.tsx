'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData } from '@/lib/api';
import {
  MetricCard,
  Badge,
  Callout,
  CollapsibleSection,
} from '@/components/ui';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type Action = {
  id: string;
  priority: number;
  severity: Severity;
  title: string;
  detail: string;
  sourcePath: string;
  reason: string;
  dueDate?: string | null;
};

type Indicators = {
  unresolvedAlerts: number;
  criticalAlerts: number;
  overdueTasks: number;
  lowStockItems: number;
  failedWorkflows: number;
  activeRisks: number;
  tasksToReview: number;
  recordedIncomeThisMonthUgx: number;
  recordedExpensesThisMonthUgx: number;
  recordedNetThisMonthUgx: number;
  latestCashSnapshot: { openingCashUgx: number; asOfDate: string; note: string } | null;
  upcomingPlannedOrCommittedOutflowUgx: number;
};

type Dashboard = {
  today: string;
  generatedAt: string;
  actionList: Action[];
  indicators: Indicators;
  cashCaveat: string;
  modules?: { limits?: string };
};

const money = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        maximumFractionDigits: 0,
      }).format(n);

const fmt = (n: number | string | undefined) =>
  Number(n || 0).toLocaleString('en-UG');

function severityTone(s: string): 'danger' | 'warn' | 'info' | 'neutral' {
  switch (s) {
    case 'critical': return 'danger';
    case 'high': return 'warn';
    case 'medium': return 'info';
    default: return 'neutral';
  }
}

export default function CommandCentrePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [priority, setPriority] = useState<'all' | 'critical' | 'high' | 'due'>('all');

  async function load() {
    setBusy(true);
    setError('');
    try {
      const r = await getData<Dashboard>('/command-centre/dashboard');
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load command centre');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const k = data?.indicators;
  const allActions = data?.actionList ?? [];
  const actions = allActions.filter(a => {
    if (priority === 'all') return true;
    if (priority === 'critical') return a.severity === 'critical';
    if (priority === 'high') return a.severity === 'critical' || a.severity === 'high';
    if (priority === 'due') return !!a.dueDate;
    return true;
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Farm command centre</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/command-centre', 'Command centre'],
            ['/alert-center', 'Alerts & escalation'],
            ['/management-intelligence', 'Management intelligence'],
            ['/cashflow', 'Cash flow & capital'],
            ['/workforce', 'Workforce'],
            ['/inventory-control', 'Central inventory'],
            ['/risk-management', 'Risk management'],
            ['/maintenance', 'Maintenance'],
            ['/performance-strategy', 'Performance strategy'],
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
              DAILY OPERATING SYSTEM
            </p>
            <h1 style={{ margin: 0 }}>Farm command centre</h1>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Masulita Green Farms · {data?.today ?? 'Loading…'}
            </p>
          </div>
          <button className="btn" onClick={() => void load()} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {!data && !error && (
          <p className="muted" style={{ padding: '24px 0' }}>
            Loading command centre…
          </p>
        )}

        {data && k && (
          <>
            {/* Indicator cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricCard
                label="Unresolved alerts"
                value={fmt(k.unresolvedAlerts)}
                detail="All priorities"
                tone={k.unresolvedAlerts > 0 ? 'warn' : 'success'}
              />
              <MetricCard
                label="Critical alerts"
                value={fmt(k.criticalAlerts)}
                detail="Needs immediate action"
                tone={k.criticalAlerts > 0 ? 'danger' : 'success'}
              />
              <MetricCard
                label="Overdue tasks"
                value={fmt(k.overdueTasks)}
                detail="Past due date"
                tone={k.overdueTasks > 0 ? 'danger' : 'success'}
              />
              <MetricCard
                label="Low-stock items"
                value={fmt(k.lowStockItems)}
                detail="Below reorder level"
                tone={k.lowStockItems > 0 ? 'warn' : 'success'}
              />
              <MetricCard
                label="Failed workflows"
                value={fmt(k.failedWorkflows)}
                detail="Needs review"
                tone={k.failedWorkflows > 0 ? 'danger' : 'success'}
              />
              <MetricCard
                label="Active risks"
                value={fmt(k.activeRisks)}
                detail="Open risk register"
                tone={k.activeRisks > 0 ? 'warn' : 'success'}
              />
              <MetricCard
                label="Tasks awaiting review"
                value={fmt(k.tasksToReview)}
                detail="Submitted or blocked"
                tone={k.tasksToReview > 0 ? 'warn' : 'neutral'}
              />
            </div>

            {/* Financial + priorities two-column */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <section className="panel" style={{ margin: 0 }}>
                <h2 style={{ marginTop: 0 }}>Financial snapshot</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Row
                    label="Income this month"
                    value={money(k.recordedIncomeThisMonthUgx)}
                    tone={k.recordedIncomeThisMonthUgx > 0 ? 'success' : 'neutral'}
                  />
                  <Row
                    label="Expenses this month"
                    value={money(k.recordedExpensesThisMonthUgx)}
                    tone={k.recordedExpensesThisMonthUgx > 0 ? 'warn' : 'neutral'}
                  />
                  <Row
                    label="Recorded net this month"
                    value={money(k.recordedNetThisMonthUgx)}
                    tone={k.recordedNetThisMonthUgx >= 0 ? 'success' : 'danger'}
                  />
                  <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                  <Row
                    label="Latest cash snapshot"
                    value={
                      k.latestCashSnapshot
                        ? money(k.latestCashSnapshot.openingCashUgx)
                        : 'Not recorded'
                    }
                    tone={k.latestCashSnapshot ? 'neutral' : 'warn'}
                  />
                  {k.latestCashSnapshot && (
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                      As of {k.latestCashSnapshot.asOfDate} · {k.latestCashSnapshot.note}
                    </p>
                  )}
                  <Row
                    label="Planned / committed outflows, reserves & investments"
                    value={money(k.upcomingPlannedOrCommittedOutflowUgx)}
                    tone="neutral"
                  />
                </div>
                <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                  {data.cashCaveat}
                </p>
                <Link href="/cashflow" className="btn" style={{ marginTop: 8 }}>
                  Review cash flow
                </Link>
              </section>

              <section className="panel" style={{ margin: 0 }}>
                <h2 style={{ marginTop: 0 }}>First management priorities</h2>
                <ol style={{ margin: '0 0 0 20px', padding: 0 }}>
                  <li style={{ marginBottom: 6 }}>Deal with critical and high alerts first.</li>
                  <li style={{ marginBottom: 6 }}>
                    Verify overdue field tasks and assign an owner for corrective action.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    Physically verify stock shortages before raising purchase requests.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    Review failed workflows before retrying any stock movement.
                  </li>
                  <li style={{ marginBottom: 0 }}>
                    Check elevated risks, overdue maintenance and stale KPI targets.
                  </li>
                </ol>
                <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                  This is a decision-support list. It does not authorise purchases, payments,
                  stock adjustments, or changes to worker tasks.
                </p>
              </section>
            </div>

            {/* Daily action list — the centerpiece */}
            <section className="panel" style={{ marginBottom: 16 }}>
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
                  <h2 style={{ margin: 0 }}>Daily action list</h2>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Sorted by rule-based priority, then due date. Verify source records
                    before acting.
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span className="muted">Filter</span>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as typeof priority)}
                    style={{ width: 'auto' }}
                  >
                    <option value="all">All priorities ({allActions.length})</option>
                    <option value="critical">
                      Critical only (
                      {allActions.filter(a => a.severity === 'critical').length})
                    </option>
                    <option value="high">
                      High & critical (
                      {allActions.filter(a => ['critical', 'high'].includes(a.severity)).length})
                    </option>
                    <option value="due">
                      With a due date ({allActions.filter(a => !!a.dueDate).length})
                    </option>
                  </select>
                </label>
              </div>

              {actions.length === 0 ? (
                <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                  {allActions.length === 0
                    ? 'No actions recorded. The farm is clear for today.'
                    : 'No actions match this filter.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {actions.map(a => (
                    <article
                      key={a.id}
                      style={{
                        padding: 14,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        backgroundColor: 'white',
                        borderLeft: `4px solid ${
                          a.severity === 'critical'
                            ? '#dc2626'
                            : a.severity === 'high'
                            ? '#d97706'
                            : a.severity === 'medium'
                            ? '#2563eb'
                            : '#9ca3af'
                        }`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <Badge label={a.severity.toUpperCase()} tone={severityTone(a.severity)} />
                            <strong style={{ fontSize: 15 }}>{a.title}</strong>
                          </div>
                        </div>
                        <Link href={a.sourcePath} className="btn" style={{ whiteSpace: 'nowrap' }}>
                          Open module →
                        </Link>
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: 13 }}>{a.detail}</p>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {a.reason}
                        {a.dueDate && <> · Due {a.dueDate}</>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Data coverage */}
            <Callout title="Operational data coverage" tone="info">
              <p style={{ margin: '0 0 8px', fontSize: 13 }}>
                Read-only snapshot generated{' '}
                {new Date(data.generatedAt).toLocaleString()}.
                {data.modules?.limits && <> {data.modules.limits}</>}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/alert-center" className="btn">
                  Review alerts
                </Link>
                <Link href="/management-intelligence" className="btn">
                  Management report
                </Link>
                <Link href="/performance-intelligence" className="btn">
                  KPI integration
                </Link>
                <Link href="/data-integrity" className="btn">
                  Data integrity
                </Link>
              </div>
            </Callout>
          </>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warn' | 'danger' | 'neutral';
}) {
  const color =
    tone === 'success'
      ? '#15803d'
      : tone === 'warn'
      ? '#a16207'
      : tone === 'danger'
      ? '#b91c1c'
      : undefined;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <strong style={{ fontSize: 14, color }}>{value}</strong>
    </div>
  );
}