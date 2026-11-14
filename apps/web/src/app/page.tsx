'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData } from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';
import {
  MetricCard,
  Badge,
  Callout,
  tdLeft,
  thLeft,
  tableStyle,
  theadRow,
  bodyRow,
} from '@/components/ui';

// ---- Types ----
type Summary = {
  generatedAt: string;
  finance: {
    recordedIncomeUgx: number;
    recordedExpensesUgx: number;
    operatingNetUgx: number;
    transfersUgx: number;
  };
  sales: {
    orderValueUgx: number;
    amountPaidUgx: number;
    outstandingUgx: number;
    orderCount: number;
  };
  operations: {
    inventoryItems: number;
    lowStockItems: number;
    openTasks: number;
    overdueTasks: number;
  };
  inspections: {
    total: number;
    open: number;
    overdue: number;
    dueWithin7Days: number;
    highOrCriticalOpen: number;
    evidenceCount: number;
  };
  monthlyFinancialTrend: { month: string; incomeUgx: number; expensesUgx: number; netUgx: number }[];
  attentionItems: unknown[];
  performanceByBusinessLine: Record<string, { income: number; expenses: number; net: number }>;
  warnings: string[];
};

type Block = {
  _id: string;
  blockId: string;
  location: string;
  areaAcres: number;
  initialTrees?: number;
  latestLiveTrees?: number;
  survivalRatePercent: number | null;
};

type PlantationIntel = {
  blocks: Block[];
  totals: {
    blocks: number;
    areaAcres: number;
    initialTreesRecorded: number;
    liveTreesRecorded: number;
    blocksMissingTreeCounts: number;
  };
};

type Hive = {
  _id: string;
  hiveId: string;
  apiarySite: string;
  colonyStatus: string;
  honeyHarvestedKg: number;
};

type AuditEvent = {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorEmail: string;
  createdAt: string;
};

type User = { id: string; email: string; role: string };

// ---- Component ----
export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plantations, setPlantations] = useState<PlantationIntel | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasToken = !!localStorage.getItem('forestos_token');
    setAuthed(hasToken);
    if (!hasToken) {
      setLoading(false);
      return;
    }

    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, p, h, a, me] = await Promise.all([
        getData<Summary>('/dashboard/summary'),
        getData<PlantationIntel>('/plantations/intelligence'),
        getData<Hive[]>('/hives'),
        getData<AuditEvent[]>('/audit').catch(() => [] as AuditEvent[]),
        getData<User>('/auth/me').catch(() => null),
      ]);
      setSummary(s);
      setPlantations(p);
      setHives(h);
      setAudit(a);
      setUser(me);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  // ---- Derived values ----
  const totalAcres = plantations?.totals.areaAcres ?? 0;
  const totalInitialTrees = plantations?.totals.initialTreesRecorded ?? 0;
  const totalLiveTrees = plantations?.totals.liveTreesRecorded ?? 0;
  const blockCount = plantations?.totals.blocks ?? 0;
  const survivalPct =
    totalInitialTrees > 0 ? (100 * totalLiveTrees) / totalInitialTrees : null;

  const occupiedHives = hives.filter(h => h.colonyStatus === 'Occupied').length;
  const attentionHives = hives.filter(h =>
    ['Weak', 'Queenless', 'Absconded'].includes(h.colonyStatus)
  ).length;

  const criticalBlocks =
    plantations?.blocks.filter(
      b => b.survivalRatePercent !== null && b.survivalRatePercent < 50
    ) ?? [];

  const attention: { label: string; href: string; tone: 'warn' | 'danger' | 'info' }[] = [];
  if (criticalBlocks.length > 0) {
    attention.push({
      label: `${criticalBlocks.length} plantation block${criticalBlocks.length > 1 ? 's' : ''} below 50% survival (${criticalBlocks
        .map(b => b.blockId)
        .join(', ')})`,
      href: '/plantation-intelligence',
      tone: 'danger',
    });
  }
  if (attentionHives > 0) {
    attention.push({
      label: `${attentionHives} hive${attentionHives > 1 ? 's' : ''} need attention (Weak, Queenless, or Absconded)`,
      href: '/apiary',
      tone: 'warn',
    });
  }
  if (summary && summary.finance.operatingNetUgx < 0) {
    attention.push({
      label: `Operating net is negative (${summary.finance.operatingNetUgx.toLocaleString()} UGX)`,
      href: '/finance',
      tone: 'warn',
    });
  }
  if (summary && summary.inspections.overdue > 0) {
    attention.push({
      label: `${summary.inspections.overdue} inspections overdue`,
      href: '/inspections',
      tone: 'danger',
    });
  }
  if (summary && summary.operations.overdueTasks > 0) {
    attention.push({
      label: `${summary.operations.overdueTasks} tasks overdue`,
      href: '/tasks',
      tone: 'danger',
    });
  }

  return (
    <div className="shell">
      <NavSidebar />

      <main id="main-content" className="main">
        <h1>Executive dashboard</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Eucalyptus forestry + beekeeping · Masulita, Wakiso, Uganda
        </p>

        {error && <p className="error">{error}</p>}

        {!authed && !loading && (
          <Callout title="Sign in to see your farm data" tone="info">
            The dashboard shows real numbers from your database. <Link href="/login">Sign in</Link> to view them.
          </Callout>
        )}

        {authed && loading && (
          <p className="muted">Loading dashboard…</p>
        )}

        {authed && !loading && summary && plantations && (
          <>
            {/* === Business overview === */}
            <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Business overview</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricCard
                label="Total land"
                value={`${totalAcres.toFixed(1)} ac`}
                detail={`${blockCount} plantation block${blockCount === 1 ? '' : 's'}`}
              />
              <MetricCard
                label="Trees live"
                value={totalLiveTrees.toLocaleString()}
                detail={
                  totalInitialTrees > 0
                    ? `of ${totalInitialTrees.toLocaleString()} planted (${survivalPct?.toFixed(1)}%)`
                    : 'No initial count'
                }
                tone={
                  survivalPct === null
                    ? 'neutral'
                    : survivalPct >= 95
                    ? 'success'
                    : survivalPct >= 85
                    ? 'warn'
                    : 'danger'
                }
              />
              <MetricCard
                label="Hives"
                value={String(hives.length)}
                detail={
                  hives.length === 0
                    ? 'None registered'
                    : `${occupiedHives} occupied · ${attentionHives} need attention`
                }
                tone={
                  attentionHives > 0 ? 'warn' : hives.length > 0 ? 'success' : 'neutral'
                }
              />
              <MetricCard
                label="Net position"
                value={`${summary.finance.operatingNetUgx.toLocaleString()} UGX`}
                detail={`Income ${summary.finance.recordedIncomeUgx.toLocaleString()} · Expenses ${summary.finance.recordedExpensesUgx.toLocaleString()}`}
                tone={summary.finance.operatingNetUgx >= 0 ? 'success' : 'danger'}
              />
            </div>

            {/* === Operations overview === */}
            <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Operations overview</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <MetricCard
                label="Inspections"
                value={String(summary.inspections.total)}
                detail={
                  summary.inspections.overdue > 0
                    ? `${summary.inspections.overdue} overdue · ${summary.inspections.dueWithin7Days} due within 7 days`
                    : summary.inspections.dueWithin7Days > 0
                    ? `${summary.inspections.dueWithin7Days} due within 7 days`
                    : 'None scheduled'
                }
                tone={summary.inspections.overdue > 0 ? 'danger' : 'neutral'}
              />
              <MetricCard
                label="Open tasks"
                value={String(summary.operations.openTasks)}
                detail={
                  summary.operations.overdueTasks > 0
                    ? `${summary.operations.overdueTasks} overdue`
                    : 'None overdue'
                }
                tone={summary.operations.overdueTasks > 0 ? 'warn' : 'neutral'}
              />
              <MetricCard
                label="Inventory items"
                value={String(summary.operations.inventoryItems)}
                detail={
                  summary.operations.lowStockItems > 0
                    ? `${summary.operations.lowStockItems} below reorder`
                    : 'All above threshold'
                }
                tone={summary.operations.lowStockItems > 0 ? 'warn' : 'neutral'}
              />
              <MetricCard
                label="Sales outstanding"
                value={`${summary.sales.outstandingUgx.toLocaleString()} UGX`}
                detail={`${summary.sales.orderCount} order${summary.sales.orderCount === 1 ? '' : 's'}`}
                tone={summary.sales.outstandingUgx > 0 ? 'warn' : 'neutral'}
              />
            </div>

            {/* === Attention panel === */}
            <section
              className="panel"
              style={{
                marginBottom: 24,
                borderLeft: attention.length > 0 ? '4px solid #dc2626' : '4px solid #16a34a',
                backgroundColor: attention.length > 0 ? '#fef2f2' : '#f0fdf4',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
                {attention.length > 0
                  ? `⚠️ ${attention.length} item${attention.length > 1 ? 's' : ''} need attention`
                  : '✓ All clear'}
              </h2>
              {attention.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {attention.map((a, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <Link href={a.href} style={{ color: a.tone === 'danger' ? '#b91c1c' : '#92400e' }}>
                        {a.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No pending attention items across plantations, hives, finance, inspections, or tasks.
                </p>
              )}
            </section>

            {/* === Quick access === */}
            <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 18 }}>Quick access</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <QuickCard
                href="/plantations"
                title="Plantations"
                line1={`${blockCount} blocks · ${totalAcres.toFixed(1)} ac`}
                line2={survivalPct !== null ? `${survivalPct.toFixed(1)}% survival` : 'No counts'}
              />
              <QuickCard
                href="/apiary"
                title="Apiary"
                line1={`${hives.length} hives · ${occupiedHives} occupied`}
                line2={attentionHives > 0 ? `${attentionHives} need attention` : 'All colonies healthy'}
                warn={attentionHives > 0}
              />
              <QuickCard
                href="/finance"
                title="Finance"
                line1={`Net ${summary.finance.operatingNetUgx.toLocaleString()} UGX`}
                line2={`Expenses ${summary.finance.recordedExpensesUgx.toLocaleString()} UGX`}
                warn={summary.finance.operatingNetUgx < 0}
              />
              <QuickCard
                href="/inspections"
                title="Inspections"
                line1={`${summary.inspections.total} scheduled`}
                line2={
                  summary.inspections.overdue > 0
                    ? `${summary.inspections.overdue} overdue`
                    : 'None overdue'
                }
                warn={summary.inspections.overdue > 0}
              />
              <QuickCard
                href="/inventory"
                title="Inventory"
                line1={`${summary.operations.inventoryItems} items`}
                line2={
                  summary.operations.lowStockItems > 0
                    ? `${summary.operations.lowStockItems} low stock`
                    : 'All above threshold'
                }
                warn={summary.operations.lowStockItems > 0}
              />
              <QuickCard
                href="/tasks"
                title="Tasks"
                line1={`${summary.operations.openTasks} open`}
                line2={
                  summary.operations.overdueTasks > 0
                    ? `${summary.operations.overdueTasks} overdue`
                    : 'None overdue'
                }
                warn={summary.operations.overdueTasks > 0}
              />
            </div>

            {/* === Recent activity === */}
            <section className="panel" style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0 }}>Recent activity</h2>
                <Link href="/audit" className="muted" style={{ fontSize: 13 }}>
                  View full audit trail →
                </Link>
              </div>
              {audit.length === 0 ? (
                <p className="muted">No activity yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRow}>
                        <th style={thLeft}>When</th>
                        <th style={thLeft}>Action</th>
                        <th style={thLeft}>Summary</th>
                        <th style={thLeft}>Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.slice(0, 5).map(e => (
                        <tr key={e._id} style={bodyRow}>
                          <td style={{ ...tdLeft, fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                            {new Date(e.createdAt).toLocaleString()}
                          </td>
                          <td style={tdLeft}>
                            <Badge
                              label={e.action}
                              tone={
                                e.action === 'created'
                                  ? 'ok'
                                  : e.action === 'deleted'
                                  ? 'danger'
                                  : 'info'
                              }
                            />
                          </td>
                          <td style={tdLeft}>{e.summary}</td>
                          <td style={{ ...tdLeft, fontSize: 13, color: '#6b7280' }}>
                            {e.actorEmail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* === Financial trend === */}
            {summary.monthlyFinancialTrend.length > 0 && (
              <section className="panel" style={{ marginBottom: 24 }}>
                <h2 style={{ marginTop: 0 }}>Monthly financial trend</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRow}>
                        <th style={thLeft}>Month</th>
                        <th style={{ ...thLeft, textAlign: 'right' }}>Income (UGX)</th>
                        <th style={{ ...thLeft, textAlign: 'right' }}>Expenses (UGX)</th>
                        <th style={{ ...thLeft, textAlign: 'right' }}>Net (UGX)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.monthlyFinancialTrend.map(m => (
                        <tr key={m.month} style={bodyRow}>
                          <td style={tdLeft}>{m.month}</td>
                          <td style={{ ...tdLeft, textAlign: 'right', color: '#15803d' }}>
                            {m.incomeUgx.toLocaleString()}
                          </td>
                          <td style={{ ...tdLeft, textAlign: 'right', color: '#b91c1c' }}>
                            {m.expensesUgx.toLocaleString()}
                          </td>
                          <td
                            style={{
                              ...tdLeft,
                              textAlign: 'right',
                              fontWeight: 600,
                              color: m.netUgx >= 0 ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {m.netUgx.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* === Data warnings === */}
            {summary.warnings.length > 0 && (
              <Callout title="Data quality notes">
                <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                  {summary.warnings.map(w => (
                    <li key={w} style={{ marginBottom: 6 }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}
          </>
        )}

        {/* === Development status (always shown) === */}
        <section className="panel" style={{ marginTop: 24 }}>
          <b>Development status</b>
          <p className="muted" style={{ marginBottom: 0 }}>
            Starter build. Do not expose publicly before authentication, role permissions, backups and deployment security are implemented.
          </p>
        </section>
      </main>
    </div>
  );
}

// ---- QuickCard helper ----
function QuickCard({
  href,
  title,
  line1,
  line2,
  warn,
}: {
  href: string;
  title: string;
  line1: string;
  line2: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        display: 'block',
        textDecoration: 'none',
        padding: 16,
        borderLeft: warn ? '3px solid #d97706' : undefined,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 13 }}>
        {line1}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
        {line2}
      </div>
    </Link>
  );
}

