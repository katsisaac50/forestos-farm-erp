'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';
import {
  MetricCard,
  Segmented,
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
type Severity = 'critical' | 'high' | 'review' | 'medium' | 'low';
type Status = 'open' | 'under_investigation' | 'awaiting_evidence' | 'resolved' | 'closed';

type CaseEvent = {
  _id?: string;
  eventType: string;
  actor: string;
  reason: string;
  previousValue?: string;
  newValue?: string;
  evidenceReference?: string;
  createdAt?: string;
};

type CaseRow = {
  _id: string;
  caseCode: string;
  title: string;
  severity: Severity;
  status: Status;
  description: string;
  sourceType: string;
  sourceReference: string;
  createdBy: string;
  assignedTo?: string;
  evidenceReference?: string;
  resolutionSummary?: string;
  closeReason?: string;
  recordVersion: number;
  secondReviewRequired: boolean;
  secondReviewedBy?: string;
  secondReviewedAt?: string;
  updatedAt?: string;
  events?: CaseEvent[];
};

type CreateForm = {
  caseCode: string;
  title: string;
  severity: Severity;
  description: string;
  sourceType: string;
  sourceReference: string;
  assignedTo: string;
};

type EditForm = {
  assignedTo: string;
  status: Status;
  evidenceReference: string;
  resolutionSummary: string;
  closeReason: string;
  note: string;
};

const SEVERITIES: Severity[] = ['critical', 'high', 'review', 'medium', 'low'];
const STATUSES: Status[] = [
  'open',
  'under_investigation',
  'awaiting_evidence',
  'resolved',
  'closed',
];

const label = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

function severityTone(s: string): 'danger' | 'warn' | 'info' | 'neutral' {
  switch (s) {
    case 'critical': return 'danger';
    case 'high': return 'warn';
    case 'review':
    case 'medium': return 'info';
    default: return 'neutral';
  }
}

function statusTone(s: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'closed': return 'neutral';
    case 'resolved': return 'ok';
    case 'under_investigation': return 'warn';
    case 'awaiting_evidence': return 'info';
    default: return 'info';
  }
}

const initialCreate: CreateForm = {
  caseCode: '',
  title: '',
  severity: 'high',
  description: '',
  sourceType: 'financial_reconciliation',
  sourceReference: '',
  assignedTo: '',
};

const initialEdit: EditForm = {
  assignedTo: '',
  status: 'open',
  evidenceReference: '',
  resolutionSummary: '',
  closeReason: '',
  note: '',
};

export default function FinancialInvestigationCasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [detail, setDetail] = useState<CaseRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [createForm, setCreateForm] = useState<CreateForm>(initialCreate);
  const [editForm, setEditForm] = useState<EditForm>(initialEdit);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (severityFilter !== 'all') q.set('severity', severityFilter);
      const suffix = q.toString() ? '?' + q.toString() : '';
      const r = await getData<CaseRow[]>('/financial-investigation-cases' + suffix);
      setCases(Array.isArray(r) ? r : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load cases');
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData('/financial-investigation-cases', {
        caseCode: createForm.caseCode.trim(),
        title: createForm.title.trim(),
        severity: createForm.severity,
        description: createForm.description.trim(),
        sourceType: createForm.sourceType.trim(),
        sourceReference: createForm.sourceReference.trim(),
        assignedTo: createForm.assignedTo.trim() || undefined,
      });
      setNotice('Case opened.');
      setCreateForm(initialCreate);
      setCreateOpen(false);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create case');
    } finally {
      setBusy(false);
    }
  }

  async function inspect(c: CaseRow) {
    try {
      const d = await getData<CaseRow>('/financial-investigation-cases/' + c._id);
      setDetail(d);
      setEditForm({
        assignedTo: d.assignedTo ?? '',
        status: d.status,
        evidenceReference: d.evidenceReference ?? '',
        resolutionSummary: d.resolutionSummary ?? '',
        closeReason: '',
        note: '',
      });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load case');
    }
  }

  async function saveUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;

    // Guard: if nothing changed and no note, service will 400.
    const changed =
      editForm.assignedTo !== (detail.assignedTo ?? '') ||
      editForm.status !== detail.status ||
      editForm.evidenceReference !== (detail.evidenceReference ?? '') ||
      editForm.resolutionSummary !== (detail.resolutionSummary ?? '') ||
      editForm.closeReason.trim().length > 0 ||
      editForm.note.trim().length > 0;

    if (!changed) {
      setError('No changes to save. Update a field or add a note.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      await patchData('/financial-investigation-cases/' + detail._id, {
        assignedTo: editForm.assignedTo || undefined,
        status: editForm.status,
        evidenceReference: editForm.evidenceReference.trim() || undefined,
        resolutionSummary: editForm.resolutionSummary.trim() || undefined,
        closeReason: editForm.closeReason.trim() || undefined,
        note: editForm.note.trim() || undefined,
        expectedVersion: detail.recordVersion,
      });
      setNotice('Case updated.');
      await inspect(detail);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save update');
    } finally {
      setBusy(false);
    }
  }

  async function secondReview() {
    if (!detail) return;
    const reason = window.prompt(
      'Reason for independent second review? (10+ chars, must be a different user from the creator)'
    );
    if (!reason || reason.trim().length < 10) {
      setError('Second-review reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData(`/financial-investigation-cases/${detail._id}/second-review`, {
        reason: reason.trim(),
      });
      setNotice('Second review recorded.');
      await inspect(detail);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Second review failed');
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!detail) return;
    const reason = window.prompt('Reason for reopening this case? (10+ chars)');
    if (!reason || reason.trim().length < 10) {
      setError('Reopen reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData(`/financial-investigation-cases/${detail._id}/reopen`, {
        reason: reason.trim(),
      });
      setNotice('Case reopened.');
      await inspect(detail);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reopen failed');
    } finally {
      setBusy(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setEditForm(initialEdit);
  }

  // ---- Derived metrics ----
  const openCount = cases.filter(
    c => c.status === 'open' || c.status === 'under_investigation' || c.status === 'awaiting_evidence'
  ).length;
  const resolvedCount = cases.filter(c => c.status === 'resolved').length;
  const closedCount = cases.filter(c => c.status === 'closed').length;
  const criticalCount = cases.filter(
    c => c.severity === 'critical' && c.status !== 'closed'
  ).length;
  const awaitingReview = cases.filter(
    c => c.secondReviewRequired && !c.secondReviewedBy && c.status !== 'closed'
  ).length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🌳 ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/finance', 'Finance'],
            ['/financial-discrepancies', 'Discrepancies'],
            ['/financial-investigation-cases', 'Investigation cases'],
            ['/capital-spend-verification', 'Capital spending'],
            ['/audit', 'Audit trail'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Investigation cases</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Assign responsibility, document evidence references, and preserve full case history.
          High and critical cases require independent second review before closure.
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
            label="Open / active"
            value={String(openCount)}
            detail={`${cases.length} total cases`}
            tone={openCount > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Critical open"
            value={String(criticalCount)}
            detail={criticalCount > 0 ? 'Highest priority' : 'None'}
            tone={criticalCount > 0 ? 'danger' : 'neutral'}
          />
          <MetricCard
            label="Awaiting second review"
            value={String(awaitingReview)}
            detail={awaitingReview > 0 ? 'Blocks closure' : 'All reviewed'}
            tone={awaitingReview > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Resolved / closed"
            value={`${resolvedCount} / ${closedCount}`}
            detail="Case outcomes"
            tone={closedCount > 0 ? 'success' : 'neutral'}
          />
        </div>

        {/* Create form */}
        <CollapsibleSection
          title="Open a case"
          open={createOpen}
          onToggle={() => setCreateOpen(o => !o)}
          actionLabel="+ New case"
        >
          <form onSubmit={createCase}>
            <FormSection title="Case identity">
              <label>
                Case code *
                <input
                  value={createForm.caseCode}
                  onChange={e => setCreateForm({ ...createForm, caseCode: e.target.value })}
                  placeholder="FC-2026-001"
                  required
                />
              </label>
              <label>
                Title *
                <input
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Short summary of the issue"
                  required
                />
              </label>
              <label>
                Severity *
                <select
                  value={createForm.severity}
                  onChange={e =>
                    setCreateForm({ ...createForm, severity: e.target.value as Severity })
                  }
                >
                  {SEVERITIES.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Assigned to (email)
                <input
                  value={createForm.assignedTo}
                  onChange={e => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                  placeholder="investigator@example.com"
                />
              </label>
            </FormSection>

            <FormSection title="Source">
              <label>
                Source type *
                <select
                  value={createForm.sourceType}
                  onChange={e => setCreateForm({ ...createForm, sourceType: e.target.value })}
                >
                  {[
                    'financial_reconciliation',
                    'statement_matching',
                    'financial_exception',
                    'audit_trail',
                    'manual_review',
                  ].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Source reference *
                <input
                  value={createForm.sourceReference}
                  onChange={e =>
                    setCreateForm({ ...createForm, sourceReference: e.target.value })
                  }
                  placeholder="e.g. reconciliation ID or statement row"
                  required
                />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Description *
              <textarea
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="What was found, and what needs investigating?"
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Creating…' : 'Create case'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Segmented
            options={[
              { key: 'all', label: `All (${cases.length})` },
              { key: 'open', label: 'Open' },
              { key: 'under_investigation', label: 'In progress' },
              { key: 'awaiting_evidence', label: 'Awaiting evidence' },
              { key: 'resolved', label: 'Resolved' },
              { key: 'closed', label: 'Closed' },
            ]}
            value={statusFilter}
            onChange={k => setStatusFilter(k as typeof statusFilter)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Severity</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as typeof severityFilter)}
              style={{ width: 'auto' }}
            >
              <option value="all">All severities</option>
              {SEVERITIES.map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Case list */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Case register</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {cases.length} {cases.length === 1 ? 'case' : 'cases'}
            </span>
          </div>

          {cases.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No cases match the current filters. Click + New case to open one.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Case</th>
                    <th style={thLeft}>Severity</th>
                    <th style={thLeft}>Status</th>
                    <th style={thLeft}>Assignee</th>
                    <th style={thLeft}>Source</th>
                    <th style={thLeft}>Review</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c._id} style={bodyRow}>
                      <td style={tdLeft}>
                        <div style={{ ...mono, fontWeight: 600 }}>{c.caseCode}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {c.title}
                        </div>
                      </td>
                      <td style={tdLeft}>
                        <Badge label={c.severity} tone={severityTone(c.severity)} />
                      </td>
                      <td style={tdLeft}>
                        <Badge label={label(c.status)} tone={statusTone(c.status)} />
                      </td>
                      <td style={{ ...tdLeft, fontSize: 13 }}>
                        {c.assignedTo || <span className="muted">Unassigned</span>}
                      </td>
                      <td style={{ ...tdLeft, fontSize: 12 }}>
                        <div>{label(c.sourceType)}</div>
                        <div className="muted">{c.sourceReference}</div>
                      </td>
                      <td style={tdLeft}>
                        {c.secondReviewRequired ? (
                          c.secondReviewedBy ? (
                            <Badge label="Reviewed" tone="ok" />
                          ) : (
                            <Badge label="Required" tone="warn" />
                          )
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={tdLeft}>
                        <button
                          className="btn"
                          onClick={() => void inspect(c)}
                          disabled={busy}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Detail panel */}
        {detail && (
          <>
            <section className="panel" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>
                    <span style={mono}>{detail.caseCode}</span> — {detail.title}
                  </h2>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Created by {detail.createdBy} · v{detail.recordVersion} · Source:{' '}
                    {label(detail.sourceType)} / {detail.sourceReference}
                  </p>
                </div>
                <button className="btn" onClick={closeDetail}>
                  Close
                </button>
              </div>

              <p style={{ marginBottom: 16 }}>{detail.description}</p>

              {detail.secondReviewRequired && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: detail.secondReviewedBy ? '#f0fdf4' : '#fffbeb',
                    borderLeft: `3px solid ${detail.secondReviewedBy ? '#16a34a' : '#f59e0b'}`,
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <strong>Independent review required.</strong>{' '}
                  {detail.secondReviewedBy ? (
                    <>
                      Reviewed by <strong>{detail.secondReviewedBy}</strong>
                      {detail.secondReviewedAt &&
                        ` on ${new Date(detail.secondReviewedAt).toLocaleString()}`}
                      .
                    </>
                  ) : (
                    <>
                      A different user must review before closure.{' '}
                      <button
                        className="btn"
                        onClick={() => void secondReview()}
                        disabled={busy}
                        style={{ marginLeft: 8 }}
                      >
                        Record second review
                      </button>
                    </>
                  )}
                </div>
              )}

              {detail.status !== 'closed' ? (
                <form onSubmit={saveUpdate}>
                  <FormSection title="Update case">
                    <label>
                      Assignee
                      <input
                        value={editForm.assignedTo}
                        onChange={e =>
                          setEditForm({ ...editForm, assignedTo: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={editForm.status}
                        onChange={e =>
                          setEditForm({ ...editForm, status: e.target.value as Status })
                        }
                      >
                        {STATUSES.map(s => (
                          <option key={s}>{label(s)}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Evidence reference
                      <input
                        value={editForm.evidenceReference}
                        onChange={e =>
                          setEditForm({ ...editForm, evidenceReference: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Resolution summary
                      <input
                        value={editForm.resolutionSummary}
                        onChange={e =>
                          setEditForm({ ...editForm, resolutionSummary: e.target.value })
                        }
                        placeholder="Required when status is resolved or closed"
                      />
                    </label>
                    <label>
                      Close reason
                      <input
                        value={editForm.closeReason}
                        onChange={e =>
                          setEditForm({ ...editForm, closeReason: e.target.value })
                        }
                      />
                    </label>
                  </FormSection>

                  <label style={{ display: 'block', marginTop: 16 }}>
                    Investigation note
                    <textarea
                      value={editForm.note}
                      onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                      rows={2}
                      style={{ width: '100%', marginTop: 4 }}
                      placeholder="Record what was found, or why the change is being made"
                    />
                  </label>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button className="btn" disabled={busy}>
                      {busy ? 'Saving…' : 'Save update'}
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void inspect(detail)}
                      disabled={busy}
                    >
                      Reset
                    </button>
                  </div>
                </form>
              ) : (
                <p className="muted" style={{ marginBottom: 12 }}>
                  This case is closed. Use Reopen to continue investigating.
                </p>
              )}

              {(detail.status === 'closed' || detail.status === 'resolved') && (
                <div style={{ marginTop: 16 }}>
                  <button className="btn" onClick={() => void reopen()} disabled={busy}>
                    Reopen case
                  </button>
                </div>
              )}
            </section>

            <section className="panel" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>Event history ({detail.events?.length ?? 0})</h2>
              {!detail.events || detail.events.length === 0 ? (
                <p className="muted">No events recorded yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {detail.events.map((ev, i) => (
                    <li
                      key={ev._id ?? i}
                      style={{
                        padding: 12,
                        marginBottom: 8,
                        backgroundColor: '#f9fafb',
                        borderRadius: 6,
                        borderLeft: '3px solid #d1d5db',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Badge label={label(ev.eventType)} tone="info" />
                        <span className="muted" style={{ fontSize: 12 }}>
                          {ev.createdAt
                            ? new Date(ev.createdAt).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 2 }}>
                        <strong>{ev.actor}</strong> · {ev.reason}
                      </div>
                      {ev.previousValue && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          From: {ev.previousValue} → To: {ev.newValue ?? '—'}
                        </div>
                      )}
                      {ev.evidenceReference && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Evidence: {ev.evidenceReference}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <Callout title="Control note">
          Case workflow does not prove wrongdoing or modify underlying financial records. High
          and critical cases require independent second review before closure. The creator of a
          case cannot serve as its independent reviewer.
        </Callout>
      </main>
    </div>
  );
}