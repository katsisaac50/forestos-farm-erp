'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';
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
type DeliveryStatus = {
  provider: string;
  configured: boolean;
  endpointConfigured: boolean;
  counts: { queued: number; failed: number; sent: number; loggedOnly: number };
  maxAttempts: number;
  note: string;
};

type AuditSummary = {
  generatedAt: string;
  since24Hours: number;
  total: number;
  statuses: Record<string, number>;
  providerBreakdown: Record<string, number>;
  deliverySuccessRate: number | null;
  failedUnresolved: number;
  warning: string;
};

type EscalationEvent = {
  _id: string;
  createdAt: string;
  incidentCode: string;
  incidentId: string;
  alertType: string;
  recipient: string;
  channel: string;
  deliveryStatus: string;
  attemptCount: number;
  providerName?: string;
  deliveredAt?: string;
  nextAttemptAt?: string;
  lastError?: string;
};

type DeliveryResult = {
  provider?: string;
  processed?: number;
  sent?: number;
  failed?: number;
  skipped?: boolean;
  requeued?: number;
  maxAttempts?: number;
  note?: string;
  error?: string;
};

const STATUS_OPTIONS = ['queued', 'failed', 'sent', 'suppressed', 'logged_only'] as const;

function statusTone(s: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'sent':
      return 'ok';
    case 'failed':
      return 'danger';
    case 'queued':
      return 'warn';
    case 'suppressed':
      return 'neutral';
    case 'logged_only':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function RecoveryDeliveryPage() {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [events, setEvents] = useState<EscalationEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [incidentCode, setIncidentCode] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (filterStatus) params.set('status', filterStatus);
      if (incidentCode.trim()) params.set('incidentCode', incidentCode.trim());
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());

      const [s, e, a] = await Promise.all([
        getData<DeliveryStatus>('/case-evidence/recovery-escalations/delivery-status'),
        getData<EscalationEvent[]>(
          '/case-evidence/recovery-escalations/events?' + params.toString()
        ),
        getData<AuditSummary>('/case-evidence/recovery-escalations/audit-summary'),
      ]);
      setStatus(s);
      setEvents(Array.isArray(e) ? e : []);
      setSummary(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load delivery status');
    }
  }, [filterStatus, incidentCode, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(
    path: string,
    label: string,
    body: Record<string, unknown> = { limit: 25 }
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    setResult(null);
    try {
      const r = await postData<DeliveryResult>(path, body);
      setResult(r);
      setNotice(`${label} completed.`);
      await refresh();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const columns = [
      'createdAt',
      'incidentCode',
      'incidentId',
      'alertType',
      'recipient',
      'channel',
      'deliveryStatus',
      'attemptCount',
      'providerName',
      'deliveredAt',
      'nextAttemptAt',
      'lastError',
    ] as const;
    const quote = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const header = columns.join(',');
    const rows = events.map(e =>
      columns.map(c => quote((e as unknown as Record<string, unknown>)[c])).join(',')
    );
    const csv = [header, ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `forestos-recovery-delivery-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setFilterStatus('');
    setIncidentCode('');
    setFrom('');
    setTo('');
  }

  const activeFilterCount =
    (filterStatus ? 1 : 0) + (incidentCode.trim() ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const counts = status?.counts ?? { queued: 0, failed: 0, sent: 0, loggedOnly: 0 };
  const totalProcessed = counts.sent + counts.failed;
  const successRate =
    totalProcessed > 0 ? (100 * counts.sent) / totalProcessed : null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/case-evidence', 'Case evidence'],
            ['/recovery-alerts', 'Recovery alerts'],
            ['/recovery-escalations', 'Escalations'],
            ['/recovery-delivery', 'Delivery & audit'],
            ['/recovery-provider-health', 'Provider health'],
            ['/recovery-scheduler', 'Scheduler'],
            ['/notification-policies', 'Notification policies'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Notification delivery &amp; audit</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Operational view of the recovery-escalation notification queue. Inspect delivery
          records, trigger manual processing, retry failed events, and export an audit
          snapshot.
        </p>

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
            label="Provider"
            value={status?.provider ?? '—'}
            detail={
              status?.configured
                ? 'Webhook endpoint configured'
                : 'No external webhook — internal log only'
            }
            tone={status?.configured ? 'success' : 'warn'}
          />
          <MetricCard
            label="Queued"
            value={String(counts.queued)}
            detail={counts.queued > 0 ? 'Awaiting delivery' : 'Nothing pending'}
            tone={counts.queued > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Failed"
            value={String(counts.failed)}
            detail={counts.failed > 0 ? 'Needs review or retry' : 'No failures'}
            tone={counts.failed > 0 ? 'danger' : 'neutral'}
          />
          <MetricCard
            label="Sent"
            value={String(counts.sent)}
            detail={
              successRate !== null
                ? `${successRate.toFixed(1)}% provider-accepted`
                : 'No sends recorded'
            }
            tone={counts.sent > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            label="Logged only"
            value={String(counts.loggedOnly)}
            detail="Recorded without external delivery"
            tone={counts.loggedOnly > 0 ? 'warn' : 'neutral'}
          />
        </div>

        {/* Operational summary */}
        {summary && (
          <section className="panel" style={{ marginBottom: 16 }}>
            <h2 style={{ marginTop: 0 }}>Operational summary</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Total event records
                </div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{summary.total}</div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Created in last 24h
                </div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{summary.since24Hours}</div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Unresolved failures
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: summary.failedUnresolved > 0 ? '#b91c1c' : undefined,
                  }}
                >
                  {summary.failedUnresolved}
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Audit snapshot
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {new Date(summary.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>
            {summary.warning && (
              <p
                style={{
                  margin: 0,
                  padding: 12,
                  backgroundColor: summary.failedUnresolved > 0 ? '#fef2f2' : '#fffbeb',
                  borderLeft: `3px solid ${summary.failedUnresolved > 0 ? '#dc2626' : '#f59e0b'}`,
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {summary.warning}
              </p>
            )}
          </section>
        )}

        {/* Delivery controls */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Delivery controls</h2>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            {status?.note ?? 'Checking provider configuration…'}
          </p>
          {status && !status.configured && (
            <p
              style={{
                marginBottom: 12,
                padding: 10,
                backgroundColor: '#fffbeb',
                borderLeft: '3px solid #f59e0b',
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              <strong>Webhook not configured.</strong> Set{' '}
              <code>RECOVERY_NOTIFICATION_WEBHOOK_URL</code> in the API environment to enable
              external delivery. Without it, events are recorded internally and no external
              messages are sent.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button
              className="btn"
              onClick={() =>
                void runAction(
                  '/case-evidence/recovery-escalations/deliver',
                  'Process queued'
                )
              }
              disabled={busy || !status?.configured}
              title={!status?.configured ? 'Requires RECOVERY_NOTIFICATION_WEBHOOK_URL' : undefined}
            >
              {busy ? 'Working…' : 'Process queued'}
            </button>
            <button
              className="btn"
              onClick={() =>
                void runAction(
                  '/case-evidence/recovery-escalations/retry-failed',
                  'Retry failed'
                )
              }
              disabled={busy || counts.failed === 0}
            >
              Retry failed ({counts.failed})
            </button>
            <button className="btn" onClick={() => void refresh()} disabled={busy}>
              Refresh
            </button>
            <button className="btn" onClick={exportCsv} disabled={events.length === 0}>
              Export CSV ({events.length})
            </button>
          </div>
          {result && (
            <pre
              style={{
                marginTop: 12,
                maxHeight: 180,
                overflow: 'auto',
                backgroundColor: '#f3f4f6',
                borderRadius: 6,
                padding: 12,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </section>

        {/* Filters — collapsible */}
        <CollapsibleSection
          title={`Audit filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          open={filtersOpen}
          onToggle={() => setFiltersOpen(o => !o)}
          actionLabel="Open filters"
        >
          <FormSection title="Filter criteria">
            <label>
              Delivery status
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Incident code
              <input
                value={incidentCode}
                onChange={e => setIncidentCode(e.target.value)}
                placeholder="Search incident code"
              />
            </label>
            <label>
              From date
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </label>
            <label>
              To date
              <input type="date" value={to} onChange={e => setTo(e.target.value)} />
            </label>
          </FormSection>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={() => void refresh()} disabled={busy}>
              Apply filters
            </button>
            <button className="btn" onClick={clearFilters} disabled={activeFilterCount === 0}>
              Clear all
            </button>
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Shows up to 500 most recent matching records. CSV export contains the records
            currently shown.
          </p>
        </CollapsibleSection>

        {/* Events table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Notification audit trail</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {events.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {activeFilterCount > 0
                ? 'No events match the current filters.'
                : 'No notification events recorded yet. Run the recovery scheduler or trigger an escalation to generate events.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Created</th>
                    <th style={thLeft}>Incident</th>
                    <th style={thLeft}>Alert</th>
                    <th style={thLeft}>Recipient</th>
                    <th style={thLeft}>Status</th>
                    <th style={thRight}>Attempts</th>
                    <th style={thLeft}>Delivered / next retry</th>
                    <th style={thLeft}>Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e._id} style={bodyRow}>
                      <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td style={{ ...tdLeft, ...mono }}>{e.incidentCode}</td>
                      <td style={tdLeft}>{e.alertType}</td>
                      <td style={{ ...tdLeft, fontSize: 13 }}>{e.recipient}</td>
                      <td style={tdLeft}>
                        <Badge
                          label={e.deliveryStatus}
                          tone={statusTone(e.deliveryStatus)}
                        />
                      </td>
                      <td style={tdRight}>{e.attemptCount || 0}</td>
                      <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {e.deliveredAt ? (
                          <span style={{ color: '#15803d' }}>
                            {new Date(e.deliveredAt).toLocaleString()}
                          </span>
                        ) : e.nextAttemptAt ? (
                          <span style={{ color: '#a16207' }}>
                            Retry {new Date(e.nextAttemptAt).toLocaleString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          ...tdLeft,
                          fontSize: 12,
                          color: '#b91c1c',
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={e.lastError}
                      >
                        {e.lastError ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Callout title="Understanding delivery statuses">
          <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
            <li style={{ marginBottom: 4 }}>
              <strong>queued</strong> — the event has been recorded and is waiting to be
              processed by the delivery worker.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>sent</strong> — the webhook endpoint returned HTTP 2xx. <em>This does not
              prove the recipient read the message.</em>
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>failed</strong> — the delivery attempt errored or timed out. The system
              will retry with exponential backoff until max attempts is reached.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>logged_only</strong> — no webhook is configured; the event was recorded
              internally with no external delivery attempted.
            </li>
            <li>
              <strong>suppressed</strong> — the event was deduplicated (same incident + alert
              type was already delivered recently).
            </li>
          </ul>
          <p style={{ margin: '12px 0 0', fontSize: 13 }}>
            Provider credentials stay server-side. HTTP 2xx acceptance by the endpoint is not
            the same as end-user receipt or reading.
          </p>
        </Callout>
      </main>
    </div>
  );
}