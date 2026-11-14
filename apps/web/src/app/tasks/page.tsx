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

type Task = {
  _id: string;
  taskId: string;
  organizationId: string;
  title: string;
  workstream: string;
  responsiblePerson: string;
  dueDate: string;
  priority: string;
  status: string;
  budgetUgx: number;
  actualCostUgx: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  taskId: string;
  title: string;
  workstream: string;
  responsiblePerson: string;
  dueDate: string;
  priority: string;
  status: string;
  budgetUgx: string;
  actualCostUgx: string;
  notes: string;
};

type EditState = {
  status: string;
  priority: string;
  actualCostUgx: string;
  notes: string;
};

type SortKey = 'dueDate' | 'priority' | 'status' | 'cost';

const WORKSTREAMS = ['Forestry', 'Beekeeping', 'Finance', 'Sales', 'Admin', 'Compliance'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Not started', 'In progress', 'Blocked', 'Completed', 'Cancelled'];

const blank = (): FormState => ({
  taskId: '',
  title: '',
  workstream: 'Forestry',
  responsiblePerson: '',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'Medium',
  status: 'Not started',
  budgetUgx: '0',
  actualCostUgx: '0',
  notes: '',
});

function statusTone(s: string): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'Completed':
      return 'ok';
    case 'In progress':
      return 'info';
    case 'Blocked':
      return 'danger';
    case 'Cancelled':
      return 'neutral';
    default:
      return 'warn';
  }
}

function priorityTone(p: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (p) {
    case 'High':
      return 'danger';
    case 'Medium':
      return 'warn';
    case 'Low':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function isOverdue(t: Task): boolean {
  if (!t.dueDate) return false;
  if (t.status === 'Completed' || t.status === 'Cancelled') return false;
  const due = new Date(t.dueDate).getTime();
  const now = Date.now();
  return due < now;
}

export default function Tasks() {
  const [rows, setRows] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'overdue' | 'completed' | 'blocked'>('all');
  const [workstreamFilter, setWorkstreamFilter] = useState<'all' | string>('all');
  const [sort, setSort] = useState<SortKey>('dueDate');
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    status: '',
    priority: '',
    actualCostUgx: '',
    notes: '',
  });

  async function load() {
    try {
      setRows(await getData<Task[]>('/tasks'));
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
      await postData('/tasks', {
        taskId: form.taskId.trim(),
        title: form.title.trim(),
        workstream: form.workstream,
        responsiblePerson: form.responsiblePerson.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        budgetUgx: Number(form.budgetUgx),
        actualCostUgx: Number(form.actualCostUgx),
        notes: form.notes.trim() || undefined,
      });
      setNotice('Task created.');
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

  function startEdit(x: Task) {
    setEditing(x._id);
    setEditState({
      status: x.status ?? 'Not started',
      priority: x.priority ?? 'Medium',
      actualCostUgx: String(x.actualCostUgx ?? 0),
      notes: x.notes ?? '',
    });
  }

  function cancelEdit() {
    setEditing(null);
    setEditState({ status: '', priority: '', actualCostUgx: '', notes: '' });
  }

  async function saveEdit(id: string) {
    try {
      await patchData(`/tasks/${id}`, {
        status: editState.status,
        priority: editState.priority,
        actualCostUgx: Number(editState.actualCostUgx),
        notes: editState.notes.trim() || undefined,
      });
      setNotice('Task updated.');
      cancelEdit();
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function quickStatus(x: Task, status: string) {
    try {
      await patchData(`/tasks/${x._id}`, { status });
      setNotice(`Task marked ${status.toLowerCase()}.`);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const openCount = rows.filter(
    r => r.status !== 'Completed' && r.status !== 'Cancelled'
  ).length;
  const overdueCount = rows.filter(isOverdue).length;
  const completedCount = rows.filter(r => r.status === 'Completed').length;
  const blockedCount = rows.filter(r => r.status === 'Blocked').length;
  const totalBudget = rows.reduce((s, r) => s + (r.budgetUgx ?? 0), 0);
  const totalActual = rows.reduce((s, r) => s + (r.actualCostUgx ?? 0), 0);

  const filtered = rows.filter(r => {
    if (workstreamFilter !== 'all' && r.workstream !== workstreamFilter) return false;
    if (filter === 'open') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (filter === 'overdue') return isOverdue(r);
    if (filter === 'completed') return r.status === 'Completed';
    if (filter === 'blocked') return r.status === 'Blocked';
    return true;
  });

  const visibleRows = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'priority': {
        const rank = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
        return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
      }
      case 'status':
        return a.status.localeCompare(b.status);
      case 'cost':
        return (b.actualCostUgx ?? 0) - (a.actualCostUgx ?? 0);
      default:
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });

  return (
    <div className="shell">
      <NavSidebar />

      <main id="main-content" className="main">
        <h1>Field tasks</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Task register · assignments, deadlines, and cost tracking
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
            label="Open tasks"
            value={String(openCount)}
            detail={`${rows.length} total`}
            tone={openCount > 0 ? 'neutral' : 'success'}
          />
          <MetricCard
            label="Overdue"
            value={String(overdueCount)}
            detail={overdueCount > 0 ? 'Past due date' : 'Nothing overdue'}
            tone={overdueCount > 0 ? 'danger' : 'neutral'}
          />
          <MetricCard
            label="Blocked"
            value={String(blockedCount)}
            detail={blockedCount > 0 ? 'Needs intervention' : 'Nothing blocked'}
            tone={blockedCount > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Actual cost"
            value={`${totalActual.toLocaleString()} UGX`}
            detail={
              totalBudget > 0
                ? `of ${totalBudget.toLocaleString()} budgeted (${(
                    (100 * totalActual) /
                    totalBudget
                  ).toFixed(0)}%)`
                : 'No budget recorded'
            }
            tone={totalActual > totalBudget && totalBudget > 0 ? 'warn' : 'neutral'}
          />
        </div>

        {/* Collapsible create form */}
        <CollapsibleSection
          title="Create task"
          open={formOpen}
          onToggle={() => setFormOpen(o => !o)}
          actionLabel="+ New task"
        >
          <form onSubmit={save}>
            <FormSection title="Identification">
              <label>
                Task ID *
                <input
                  value={form.taskId}
                  onChange={e => update('taskId', e.target.value)}
                  placeholder="TK-001"
                  required
                />
              </label>
              <label>
                Title *
                <input
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  placeholder="Weeding round 3 - BLK-001"
                  required
                />
              </label>
              <label>
                Workstream *
                <select value={form.workstream} onChange={e => update('workstream', e.target.value)}>
                  {WORKSTREAMS.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label>
                Responsible person *
                <input
                  value={form.responsiblePerson}
                  onChange={e => update('responsiblePerson', e.target.value)}
                  placeholder="Field crew lead"
                  required
                />
              </label>
            </FormSection>

            <FormSection title="Schedule & priority">
              <label>
                Due date *
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => update('dueDate', e.target.value)}
                  required
                />
              </label>
              <label>
                Priority
                <select value={form.priority} onChange={e => update('priority', e.target.value)}>
                  {PRIORITIES.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={form.status} onChange={e => update('status', e.target.value)}>
                  {STATUSES.map(o => <option key={o}>{o}</option>)}
                </select>
              </label>
            </FormSection>

            <FormSection title="Costs (UGX)">
              <label>
                Budget
                <input
                  type="number"
                  min={0}
                  value={form.budgetUgx}
                  onChange={e => update('budgetUgx', e.target.value)}
                />
              </label>
              <label>
                Actual cost
                <input
                  type="number"
                  min={0}
                  value={form.actualCostUgx}
                  onChange={e => update('actualCostUgx', e.target.value)}
                />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Notes
              <textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                rows={2}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save task'}
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
              { key: 'all', label: `All (${rows.length})` },
              { key: 'open', label: `Open (${openCount})` },
              { key: 'overdue', label: `Overdue (${overdueCount})` },
              { key: 'blocked', label: `Blocked (${blockedCount})` },
              { key: 'completed', label: `Completed (${completedCount})` },
            ]}
            value={filter}
            onChange={k => setFilter(k as typeof filter)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Workstream</span>
            <select
              value={workstreamFilter}
              onChange={e => setWorkstreamFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All</option>
              {WORKSTREAMS.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Sort by</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={{ width: 'auto' }}>
              <option value="dueDate">Due date (soonest)</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="cost">Actual cost</option>
            </select>
          </label>
        </div>

        {/* Task table */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Task register</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {visibleRows.length} {visibleRows.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {visibleRows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter !== 'all' || workstreamFilter !== 'all'
                ? 'No tasks match the current filters.'
                : 'No tasks yet. Click + New task to create the first one.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Task</th>
                    <th style={thLeft}>Workstream</th>
                    <th style={thLeft}>Responsible</th>
                    <th style={thLeft}>Due</th>
                    <th style={thLeft}>Priority</th>
                    <th style={thLeft}>Status</th>
                    <th style={thRight}>Actual (UGX)</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(x => {
                    const isEditing = editing === x._id;
                    const overdue = isOverdue(x);
                    return (
                      <tr
                        key={x._id}
                        style={{
                          ...bodyRow,
                          backgroundColor: overdue ? '#fef2f2' : undefined,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = overdue ? '#fee2e2' : '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = overdue ? '#fef2f2' : '')}
                      >
                        <td style={tdLeft}>
                          <div style={{ fontWeight: 500 }}>{x.title}</div>
                          <div style={{ ...mono, color: '#6b7280', fontSize: 12 }}>{x.taskId}</div>
                        </td>
                        <td style={tdLeft}>{x.workstream}</td>
                        <td style={tdLeft}>{x.responsiblePerson}</td>
                        <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                          <span style={{ color: overdue ? '#b91c1c' : undefined, fontWeight: overdue ? 600 : undefined }}>
                            {x.dueDate?.slice(0, 10)}
                          </span>
                          {overdue && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#b91c1c' }}>OVERDUE</span>
                          )}
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <select
                              value={editState.priority}
                              onChange={e => setEditState({ ...editState, priority: e.target.value })}
                              style={{ width: 100 }}
                            >
                              {PRIORITIES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <Badge label={x.priority} tone={priorityTone(x.priority)} />
                          )}
                        </td>
                        <td style={tdLeft}>
                          {isEditing ? (
                            <select
                              value={editState.status}
                              onChange={e => setEditState({ ...editState, status: e.target.value })}
                              style={{ width: 130 }}
                            >
                              {STATUSES.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <Badge label={x.status} tone={statusTone(x.status)} />
                          )}
                        </td>
                        <td style={{ ...tdRight, fontWeight: 600 }}>
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={editState.actualCostUgx}
                              onChange={e => setEditState({ ...editState, actualCostUgx: e.target.value })}
                              style={{ width: 100, textAlign: 'right' }}
                            />
                          ) : (
                            (x.actualCostUgx ?? 0).toLocaleString()
                          )}
                        </td>
                        <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                          {isEditing ? (
                            <>
                              <button className="btn" onClick={() => void saveEdit(x._id)} style={{ marginRight: 6 }}>
                                Save
                              </button>
                              <button className="btn" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {x.status !== 'Completed' && x.status !== 'Cancelled' && (
                                <button
                                  className="btn"
                                  onClick={() => void quickStatus(x, 'Completed')}
                                  title="Mark complete"
                                  style={{ marginRight: 6 }}
                                >
                                  ✓
                                </button>
                              )}
                              <button className="btn" onClick={() => startEdit(x)}>
                                Edit
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={footerRow}>
                    <td style={tdLeft} colSpan={4}>
                      Totals ({visibleRows.length} shown)
                    </td>
                    <td style={tdLeft} colSpan={2}>
                      Budget: {visibleRows.reduce((s, x) => s + (x.budgetUgx ?? 0), 0).toLocaleString()}
                    </td>
                    <td style={tdRight}>
                      {visibleRows.reduce((s, x) => s + (x.actualCostUgx ?? 0), 0).toLocaleString()}
                    </td>
                    <td style={tdLeft}>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <Callout title="Task accountability discipline">
          Overdue tasks are highlighted in red. Mark tasks completed only after verification — the status is part of the audit trail. Actual costs should be updated when invoices or receipts are received; the variance against budget is visible on the summary row.
        </Callout>
      </main>
    </div>
  );
}