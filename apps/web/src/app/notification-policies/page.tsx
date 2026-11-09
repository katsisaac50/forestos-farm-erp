'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';
import {
  MetricCard,
  Badge,
  FormSection,
  CollapsibleSection,
  NoticeBanner,
  Callout,
  thLeft,
  tdLeft,
  tableStyle,
  theadRow,
  bodyRow,
  mono,
} from '@/components/ui';

// ---- Types ----
type Severity = 'critical' | 'high' | 'medium' | 'low';
type Channel = 'webhook' | 'internal_log';

type Policy = {
  _id: string;
  policyKey: string;
  name: string;
  description: string;
  severity: Severity;
  dueSoonDays: number;
  overdueRepeatHours: number;
  approvalWaitingHours: number;
  enabled: boolean;
  recipients: string[];
  channels: Channel[];
  recordVersion: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PolicyEvent = {
  _id: string;
  policyKey: string;
  actor: string;
  action: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  previousVersion?: number;
  newVersion?: number;
  createdAt: string;
};

type EvaluateMatch = {
  incidentId: string;
  incidentCode: string;
  severity: string;
  status: string;
  policyKey: string;
  policyVersion: number;
  recipients: string[];
  channels: string[];
  dueDate: string | null;
  daysOverdue: number;
  reason: string;
};

type EvaluateResponse = {
  evaluatedAt: string;
  actor: string;
  dryRun: boolean;
  mode: string;
  policiesEvaluated: number;
  incidentsScanned: number;
  scanTruncated: boolean;
  matches: number;
  results: EvaluateMatch[];
  notice: string;
};

type FormState = {
  policyKey: string;
  name: string;
  description: string;
  severity: Severity;
  dueSoonDays: string;
  overdueRepeatHours: string;
  approvalWaitingHours: string;
  enabled: boolean;
  recipientsRaw: string;   // comma-separated
  channels: Channel[];
  reason: string;
};

const blank = (): FormState => ({
  policyKey: '',
  name: '',
  description: '',
  severity: 'medium',
  dueSoonDays: '1',
  overdueRepeatHours: '24',
  approvalWaitingHours: '24',
  enabled: true,
  recipientsRaw: '',
  channels: ['internal_log'],
  reason: '',
});

type EditState = {
  enabled: boolean;
  severity: Severity;
  dueSoonDays: string;
  overdueRepeatHours: string;
  approvalWaitingHours: string;
  recipientsRaw: string;
  channels: Channel[];
  reason: string;
  expectedVersion: number;
};

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low'];
const CHANNELS: Channel[] = ['webhook', 'internal_log'];

function severityTone(s: string): 'danger' | 'warn' | 'info' | 'neutral' {
  switch (s) {
    case 'critical': return 'danger';
    case 'high': return 'warn';
    case 'medium': return 'info';
    default: return 'neutral';
  }
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function NotificationPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [noticeText, setNoticeText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    enabled: false,
    severity: 'medium',
    dueSoonDays: '1',
    overdueRepeatHours: '24',
    approvalWaitingHours: '24',
    recipientsRaw: '',
    channels: ['internal_log'],
    reason: '',
    expectedVersion: 1,
  });
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [history, setHistory] = useState<PolicyEvent[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getData<{ items: Policy[]; total: number; notice?: string }>(
        '/notification-policies'
      );
      setPolicies(r?.items ?? []);
      setNoticeText(r?.notice ?? '');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load policies');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = {
        policyKey: form.policyKey.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        severity: form.severity,
        dueSoonDays: Number(form.dueSoonDays),
        overdueRepeatHours: Number(form.overdueRepeatHours),
        approvalWaitingHours: Number(form.approvalWaitingHours),
        enabled: form.enabled,
        recipients: parseRecipients(form.recipientsRaw),
        channels: form.channels,
        reason: form.reason.trim(),
      };
      await postData('/notification-policies', body);
      setNotice('Policy created.');
      setForm(blank());
      setFormOpen(false);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Policy) {
    setEditing(p.policyKey);
    setEditState({
      enabled: p.enabled,
      severity: p.severity,
      dueSoonDays: String(p.dueSoonDays),
      overdueRepeatHours: String(p.overdueRepeatHours),
      approvalWaitingHours: String(p.approvalWaitingHours),
      recipientsRaw: (p.recipients ?? []).join(', '),
      channels: p.channels ?? ['internal_log'],
      reason: '',
      expectedVersion: p.recordVersion,
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit(policyKey: string) {
    if (editState.reason.trim().length < 10) {
      setError('Change reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await patchData(`/notification-policies/${policyKey}`, {
        enabled: editState.enabled,
        severity: editState.severity,
        dueSoonDays: Number(editState.dueSoonDays),
        overdueRepeatHours: Number(editState.overdueRepeatHours),
        approvalWaitingHours: Number(editState.approvalWaitingHours),
        recipients: parseRecipients(editState.recipientsRaw),
        channels: editState.channels,
        reason: editState.reason.trim(),
        expectedVersion: editState.expectedVersion,
      });
      setNotice('Policy updated.');
      cancelEdit();
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function quickToggle(p: Policy) {
    const reason = window.prompt(
      `Reason for ${p.enabled ? 'disabling' : 'enabling'} "${p.policyKey}":`,
      ''
    );
    if (reason === null) return;
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await patchData(`/notification-policies/${p.policyKey}`, {
        enabled: !p.enabled,
        reason: reason.trim(),
        expectedVersion: p.recordVersion,
      });
      setNotice(`Policy ${p.enabled ? 'disabled' : 'enabled'}.`);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function showHistory(policyKey: string) {
    setHistoryKey(policyKey);
    setHistoryBusy(true);
    setHistory([]);
    try {
      const h = await getData<PolicyEvent[]>(`/notification-policies/${policyKey}/history?limit=100`);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load history');
    } finally {
      setHistoryBusy(false);
    }
  }

  async function runEvaluate() {
    setEvaluating(true);
    setError('');
    try {
      const r = await postData<EvaluateResponse>('/notification-policies/evaluate', {});
      setEvaluation(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluate failed');
    } finally {
      setEvaluating(false);
    }
  }

  function toggleChannel(c: Channel) {
    setForm(prev => {
      const has = prev.channels.includes(c);
      const next = has ? prev.channels.filter(x => x !== c) : [...prev.channels, c];
      return { ...prev, channels: next.length ? next : ['internal_log'] };
    });
  }

  function toggleEditChannel(c: Channel) {
    setEditState(prev => {
      const has = prev.channels.includes(c);
      const next = has ? prev.channels.filter(x => x !== c) : [...prev.channels, c];
      return { ...prev, channels: next.length ? next : ['internal_log'] };
    });
  }

  const enabledCount = policies.filter(p => p.enabled).length;
  const disabledCount = policies.length - enabledCount;
  const severityCounts = policies.reduce(
    (acc, p) => {
      acc[p.severity] = (acc[p.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filtered = policies.filter(p => {
    if (filter === 'enabled') return p.enabled;
    if (filter === 'disabled') return !p.enabled;
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
            ['/plantations', 'Plantations'],
            ['/apiary', 'Apiary'],
            ['/finance', 'Finance'],
            ['/sales', 'Sales'],
            ['/inventory', 'Inventory'],
            ['/tasks', 'Tasks'],
            ['/organizations', 'Organizations'],
            ['/notification-policies', 'Notification policies'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Notification policies</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Escalation rules that fire on overdue, due-soon, approval-waiting, or
          unassigned recovery incidents. Policies are configuration records — they take
          effect when the escalation evaluator runs.
        </p>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}
        {noticeText && !error && !notice && (
          <p
            className="panel"
            style={{ borderLeft: '4px solid #3b82f6', backgroundColor: '#eff6ff', fontSize: 13 }}
          >
            ℹ️ {noticeText}
          </p>
        )}

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
            label="Total policies"
            value={String(policies.length)}
            detail={`${enabledCount} enabled · ${disabledCount} disabled`}
          />
          <MetricCard
            label="Critical"
            value={String(severityCounts.critical ?? 0)}
            detail="Highest severity tier"
            tone={(severityCounts.critical ?? 0) > 0 ? 'danger' : 'neutral'}
          />
          <MetricCard
            label="High / Medium"
            value={String((severityCounts.high ?? 0) + (severityCounts.medium ?? 0))}
            detail="Mid-tier policies"
          />
          <MetricCard
            label="Last evaluation"
            value={evaluation ? `${evaluation.matches} match${evaluation.matches === 1 ? '' : 'es'}` : '—'}
            detail={
              evaluation
                ? `${evaluation.incidentsScanned} incidents scanned`
                : 'Run Evaluate to preview matches'
            }
          />
        </div>

        {/* Evaluate preview */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0 }}>Evaluation preview</h2>
            <button className="btn" onClick={() => void runEvaluate()} disabled={evaluating}>
              {evaluating ? 'Evaluating…' : 'Evaluate now'}
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            Runs the evaluator in dry-run mode. It reports which incidents would fire which
            policies. <strong>No notifications are sent.</strong>
          </p>
          {evaluation && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <Badge label={`${evaluation.policiesEvaluated} policies`} tone="info" />
                <Badge label={`${evaluation.incidentsScanned} incidents`} tone="info" />
                <Badge
                  label={`${evaluation.matches} matches`}
                  tone={evaluation.matches > 0 ? 'warn' : 'ok'}
                />
                {evaluation.scanTruncated && <Badge label="scan truncated at 2000" tone="warn" />}
              </div>
              {evaluation.results.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No incidents currently match any enabled policy.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRow}>
                        <th style={thLeft}>Incident</th>
                        <th style={thLeft}>Severity</th>
                        <th style={thLeft}>Status</th>
                        <th style={thLeft}>Reason</th>
                        <th style={thLeft}>Policy</th>
                        <th style={thLeft}>Channels</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluation.results.map((m, i) => (
                        <tr key={`${m.incidentId}-${i}`} style={bodyRow}>
                          <td style={{ ...tdLeft, ...mono }}>{m.incidentCode}</td>
                          <td style={tdLeft}>
                            <Badge label={m.severity} tone={severityTone(m.severity)} />
                          </td>
                          <td style={tdLeft}>{m.status}</td>
                          <td style={tdLeft}>{m.reason.replace(/_/g, ' ')}</td>
                          <td style={{ ...tdLeft, ...mono }}>{m.policyKey}</td>
                          <td style={tdLeft}>{m.channels.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* Create form */}
        <CollapsibleSection
          title="Create policy"
          open={formOpen}
          onToggle={() => setFormOpen(o => !o)}
          actionLabel="+ New policy"
        >
          <form onSubmit={save}>
            <FormSection title="Identity">
              <label>
                Policy key * (lowercase, 3–64 chars)
                <input
                  value={form.policyKey}
                  onChange={e => setForm({ ...form, policyKey: e.target.value })}
                  placeholder="overdue_critical_incidents"
                  pattern="^[a-z0-9][a-z0-9_-]{2,63}$"
                  required
                />
              </label>
              <label>
                Name *
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Critical overdue notifications"
                  maxLength={120}
                  required
                />
              </label>
              <label style={{ gridColumn: 'span 2' }}>
                Description * (max 500)
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Notify the owner when critical incidents are overdue"
                  maxLength={500}
                  required
                />
              </label>
            </FormSection>

            <FormSection title="Trigger conditions">
              <label>
                Severity tier *
                <select
                  value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value as Severity })}
                >
                  {SEVERITIES.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Due-soon threshold (days, 1–30)
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.dueSoonDays}
                  onChange={e => setForm({ ...form, dueSoonDays: e.target.value })}
                />
              </label>
              <label>
                Overdue repeat (hours, 1–720)
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={form.overdueRepeatHours}
                  onChange={e => setForm({ ...form, overdueRepeatHours: e.target.value })}
                />
              </label>
              <label>
                Approval-waiting (hours, 1–720)
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={form.approvalWaitingHours}
                  onChange={e => setForm({ ...form, approvalWaitingHours: e.target.value })}
                />
              </label>
            </FormSection>

            <FormSection title="Delivery">
              <label style={{ gridColumn: 'span 2' }}>
                Recipients (comma-separated, max 50)
                <input
                  value={form.recipientsRaw}
                  onChange={e => setForm({ ...form, recipientsRaw: e.target.value })}
                  placeholder="owner@example.com, manager@example.com"
                />
              </label>
              <label>
                Channels
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {CHANNELS.map(c => (
                    <label
                      key={c}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={form.channels.includes(c)}
                        onChange={() => toggleChannel(c)}
                      />
                      <span style={{ fontSize: 13 }}>{c}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label>
                Enabled
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={e => setForm({ ...form, enabled: e.target.checked })}
                    />
                    <span style={{ fontSize: 13 }}>Active when evaluator runs</span>
                  </label>
                </div>
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Change reason * (10–1000 chars, recorded in audit)
              <textarea
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Why is this policy being added?"
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                className="btn"
                disabled={
                  busy ||
                  !form.policyKey.trim() ||
                  !form.name.trim() ||
                  !form.description.trim() ||
                  form.reason.trim().length < 10 ||
                  form.channels.length === 0
                }
              >
                {busy ? 'Saving…' : 'Save policy'}
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
          </form>
        </CollapsibleSection>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['all', 'enabled', 'disabled'] as const).map(k => (
            <button
              key={k}
              className="btn"
              style={{
                backgroundColor: filter === k ? '#1f2937' : undefined,
                color: filter === k ? 'white' : undefined,
              }}
              onClick={() => setFilter(k)}
            >
              {k === 'all'
                ? `All (${policies.length})`
                : k === 'enabled'
                ? `Enabled (${enabledCount})`
                : `Disabled (${disabledCount})`}
            </button>
          ))}
        </div>

        {/* Policy list */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Policies</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {filtered.length} {filtered.length === 1 ? 'policy' : 'policies'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter !== 'all'
                ? `No ${filter} policies.`
                : 'No policies configured. Click + New policy to create the first one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Key</th>
                    <th style={thLeft}>Name</th>
                    <th style={thLeft}>Severity</th>
                    <th style={thLeft}>Enabled</th>
                    <th style={thLeft}>Thresholds</th>
                    <th style={thLeft}>Channels</th>
                    <th style={thLeft}>Recipients</th>
                    <th style={thLeft}>Version</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isEditing = editing === p.policyKey;
                    return (
                      <tr key={p._id} style={bodyRow}>
                        <td style={{ ...tdLeft, ...mono }}>{p.policyKey}</td>
                        <td style={tdLeft}>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {p.description}
                          </div>
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <select
                              value={editState.severity}
                              onChange={e =>
                                setEditState({ ...editState, severity: e.target.value as Severity })
                              }
                              style={{ width: 100 }}
                            >
                              {SEVERITIES.map(s => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge label={p.severity} tone={severityTone(p.severity)} />
                          )}
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={editState.enabled}
                              onChange={e =>
                                setEditState({ ...editState, enabled: e.target.checked })
                              }
                            />
                          ) : (
                            <Badge
                              label={p.enabled ? 'ENABLED' : 'DISABLED'}
                              tone={p.enabled ? 'ok' : 'neutral'}
                            />
                          )}
                        </td>
                        <td style={{ ...tdLeft, fontSize: 12 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={editState.dueSoonDays}
                                onChange={e =>
                                  setEditState({ ...editState, dueSoonDays: e.target.value })
                                }
                                style={{ width: 60 }}
                                title="dueSoonDays"
                              />
                              <input
                                type="number"
                                min={1}
                                max={720}
                                value={editState.overdueRepeatHours}
                                onChange={e =>
                                  setEditState({ ...editState, overdueRepeatHours: e.target.value })
                                }
                                style={{ width: 60 }}
                                title="overdueRepeatHours"
                              />
                              <input
                                type="number"
                                min={1}
                                max={720}
                                value={editState.approvalWaitingHours}
                                onChange={e =>
                                  setEditState({
                                    ...editState,
                                    approvalWaitingHours: e.target.value,
                                  })
                                }
                                style={{ width: 60 }}
                                title="approvalWaitingHours"
                              />
                            </div>
                          ) : (
                            <>
                              <div>due soon ≤ {p.dueSoonDays}d</div>
                              <div>overdue every {p.overdueRepeatHours}h</div>
                              <div>approval wait {p.approvalWaitingHours}h</div>
                            </>
                          )}
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {CHANNELS.map(c => (
                                <label
                                  key={c}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editState.channels.includes(c)}
                                    onChange={() => toggleEditChannel(c)}
                                  />
                                  <span style={{ fontSize: 12 }}>{c}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            p.channels.join(', ')
                          )}
                        </td>
                        <td style={{ ...tdLeft, fontSize: 12 }}>
                          {isEditing ? (
                            <input
                              value={editState.recipientsRaw}
                              onChange={e =>
                                setEditState({ ...editState, recipientsRaw: e.target.value })
                              }
                              style={{ width: 180 }}
                            />
                          ) : p.recipients.length > 0 ? (
                            p.recipients.join(', ')
                          ) : (
                            <span className="muted">none</span>
                          )}
                        </td>
                        <td style={{ ...tdLeft, ...mono, fontSize: 12 }}>v{p.recordVersion}</td>
                        <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <>
                              <div style={{ marginBottom: 6 }}>
                                <input
                                  value={editState.reason}
                                  onChange={e =>
                                    setEditState({ ...editState, reason: e.target.value })
                                  }
                                  placeholder="Reason (10+ chars)"
                                  style={{ width: 200, fontSize: 12 }}
                                />
                              </div>
                              <button
                                className="btn"
                                onClick={() => void saveEdit(p.policyKey)}
                                style={{ marginRight: 6 }}
                                disabled={busy}
                              >
                                Save
                              </button>
                              <button className="btn" onClick={cancelEdit} disabled={busy}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn"
                                onClick={() => startEdit(p)}
                                style={{ marginRight: 6 }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn"
                                onClick={() => void quickToggle(p)}
                                style={{ marginRight: 6 }}
                                disabled={busy}
                              >
                                {p.enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button className="btn" onClick={() => void showHistory(p.policyKey)}>
                                History
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* History panel */}
        {historyKey && (
          <section className="panel" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0 }}>
                Audit history · <span style={{ ...mono, fontSize: 16 }}>{historyKey}</span>
              </h2>
              <button className="btn" onClick={() => setHistoryKey(null)}>
                Close
              </button>
            </div>
            {historyBusy ? (
              <p className="muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="muted">No events recorded for this policy yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thLeft}>When</th>
                      <th style={thLeft}>Action</th>
                      <th style={thLeft}>Actor</th>
                      <th style={thLeft}>Reason</th>
                      <th style={thLeft}>Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h._id} style={bodyRow}>
                        <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {new Date(h.createdAt).toLocaleString()}
                        </td>
                        <td style={tdLeft}>
                          <Badge
                            label={h.action}
                            tone={
                              h.action === 'created'
                                ? 'ok'
                                : h.action === 'disabled'
                                ? 'warn'
                                : 'info'
                            }
                          />
                        </td>
                        <td style={{ ...tdLeft, fontSize: 13, color: '#6b7280' }}>{h.actor}</td>
                        <td style={tdLeft}>{h.reason ?? '—'}</td>
                        <td style={{ ...tdLeft, ...mono, fontSize: 12 }}>
                          {h.previousVersion !== undefined ? `v${h.previousVersion} → v${h.newVersion}` : `v${h.newVersion}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <Callout title="How policies work here">
          Policies are configuration only. The escalation evaluator reads enabled policies and
          matches them against open incidents — by severity, days overdue, and approval-waiting
          time. <strong>Evaluate</strong> above runs the matching logic in preview mode: it shows
          which incidents would fire which policies, but sends nothing. Actual delivery is handled
          by a separate evaluator that must explicitly consume these records. Updates use
          optimistic concurrency: each policy carries a <code>recordVersion</code>, and saves
          require an exact match, so two admins editing the same policy simultaneously will see
          one succeed and one 409.
        </Callout>
      </main>
    </div>
  );
}