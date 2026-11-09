'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getData, postData, patchData } from '@/lib/api';

type Inspection = {
  _id: string;
  inspectionId: string;
  workstream: string;
  siteOrBlock: string;
  title: string;
  dueDate: string;
  assignedTo: string;
  status: string;
  priority: string;
  checklist?: string;
  findings?: string;
  correctiveAction?: string;
  photoReference?: string;
};

type User = { email: string; role: string };

type Evidence = {
  _id: string;
  inspectionId: string;
  siteOrBlock: string;
  fileName: string;
  mimeType: string;
  caption?: string;
  capturedAt: string;
  uploadedBy: string;
};

type FormState = {
  inspectionId: string;
  workstream: string;
  siteOrBlock: string;
  title: string;
  dueDate: string;
  assignedTo: string;
  priority: string;
  checklist: string;
};

const blank = (): FormState => ({
  inspectionId: `IN-${Date.now().toString().slice(-6)}`,
  workstream: 'Forestry',
  siteOrBlock: '',
  title: 'Monthly block inspection',
  dueDate: new Date().toISOString().slice(0, 10),
  assignedTo: '',
  priority: 'Medium',
  checklist: '',
});

export default function Inspections() {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(blank());
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows(await getData<Inspection[]>('/inspections'));
      const me = await getData<User>('/auth/me');
      setUser(me);
      try {
        setEvidence(await getData<Evidence[]>('/evidence'));
      } catch {
        /* evidence optional */
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inspections');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await postData('/inspections', form);
      setNotice('Inspection scheduled.');
      setForm(blank());
      setFormOpen(false);
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create inspection');
    } finally {
      setBusy(false);
    }
  }

  async function update(x: Inspection, status: string) {
    const findings = window.prompt('Record findings (optional):', x.findings ?? '');
    if (findings === null) return;
    const correctiveAction = window.prompt(
      'Corrective action / next step (optional):',
      x.correctiveAction ?? ''
    );
    if (correctiveAction === null) return;
    try {
      await patchData(`/inspections/${x._id}`, { status, findings, correctiveAction });
      setNotice('Inspection updated.');
      await load();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update inspection');
    }
  }

  async function startInspection(x: Inspection) {
    try {
      await patchData(`/inspections/${x._id}`, { status: 'In progress' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    }
  }

  async function openEvidence(id: string) {
    try {
      const token = localStorage.getItem('forestos_token');
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/evidence/${id}/image`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!r.ok) throw new Error('Could not open image');
      const blob = await r.blob();
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open image');
    }
  }

  async function uploadEvidence(x: Inspection, file?: File) {
    if (!file) return;
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file');

      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Image processing failed'));
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82));
          };
          img.onerror = () => reject(new Error('Could not read image'));
          img.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });

      const mimeType = data.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      const result = await postData<Evidence>('/evidence', {
        inspectionId: x._id,
        siteOrBlock: x.siteOrBlock,
        fileName: file.name,
        mimeType,
        dataBase64: data,
        caption: `Evidence for ${x.title}`,
        capturedAt: new Date().toISOString(),
      });
      setEvidence(prev => [result, ...prev]);
      setNotice('Photo evidence uploaded.');
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed');
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">?? ForestOS</div>
        <div className="sub">Masulita Green Farms</div>
        <nav className="nav">
          {[
            ['/', 'Dashboard'],
            ['/plantations', 'Plantations'],
            ['/apiary', 'Apiary'],
            ['/tasks', 'Tasks'],
            ['/inspections', 'Inspections'],
            ['/field-logs', 'Field logs'],
            ['/finance', 'Finance'],
            ['/login', 'Sign in'],
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <h1>Inspection schedules &amp; accountability</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Assign inspections for eucalyptus blocks, hives and general farm operations.
          Workers see inspections assigned to their account email.
        </p>

        {user && (
          <p className="panel" style={{ marginBottom: 16 }}>
            Signed in as <b>{user.email}</b> · Role: <b>{user.role}</b>
          </p>
        )}

        {error && <p className="error">{error}</p>}
        {notice && (
          <p className="panel" style={{ borderColor: '#4ade80', color: '#15803d' }}>
            ✓ {notice}
          </p>
        )}

        {user?.role === 'owner' && (
          <section className="panel" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setFormOpen(o => !o)}
            >
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{formOpen ? '▾' : '▸'}</span>
                Schedule an inspection
              </h2>
              {!formOpen && (
                <button
                  className="btn"
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setFormOpen(true);
                  }}
                >
                  + New inspection
                </button>
              )}
            </div>

            {formOpen && (
              <form onSubmit={create} style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                  }}
                >
                  <label>
                    Inspection ID
                    <input
                      value={form.inspectionId}
                      onChange={e => updateField('inspectionId', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Workstream
                    <select
                      value={form.workstream}
                      onChange={e => updateField('workstream', e.target.value)}
                    >
                      {['Forestry', 'Beekeeping', 'General'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Site / block
                    <input
                      value={form.siteOrBlock}
                      onChange={e => updateField('siteOrBlock', e.target.value)}
                      placeholder="BLK-001"
                      required
                    />
                  </label>
                  <label>
                    Title
                    <input
                      value={form.title}
                      onChange={e => updateField('title', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Due date
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={e => updateField('dueDate', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Assigned to (email)
                    <input
                      value={form.assignedTo}
                      onChange={e => updateField('assignedTo', e.target.value)}
                      placeholder="worker@example.com"
                      required
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={form.priority}
                      onChange={e => updateField('priority', e.target.value)}
                    >
                      {['Low', 'Medium', 'High', 'Critical'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label style={{ display: 'block', marginTop: 16 }}>
                  Checklist
                  <textarea
                    value={form.checklist}
                    onChange={e => updateField('checklist', e.target.value)}
                    rows={3}
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="What should be checked during this inspection?"
                  />
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button className="btn" disabled={busy}>
                    {busy ? 'Scheduling…' : 'Schedule inspection'}
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
            )}
          </section>
        )}

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
              {user?.role === 'owner' ? 'All inspections' : 'My assigned inspections'}
            </h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {rows.length} {rows.length === 1 ? 'inspection' : 'inspections'}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No inspections yet.{' '}
              {user?.role === 'owner' && (
                <>
                  Click <strong>+ New inspection</strong> to schedule the first one.
                </>
              )}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thLeft}>Due</th>
                    <th style={thLeft}>Site / block</th>
                    <th style={thLeft}>Inspection</th>
                    <th style={thLeft}>Assigned to</th>
                    <th style={thLeft}>Priority</th>
                    <th style={thLeft}>Status</th>
                    <th style={thLeft}>Checklist / findings</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(x => (
                    <tr
                      key={x._id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      <td style={tdLeft}>{x.dueDate?.slice(0, 10) ?? '—'}</td>
                      <td style={tdLeft}>{x.siteOrBlock}</td>
                      <td style={tdLeft}>{x.title}</td>
                      <td style={tdLeft}>{x.assignedTo}</td>
                      <td style={tdLeft}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            color:
                              x.priority === 'Critical'
                                ? '#b91c1c'
                                : x.priority === 'High'
                                ? '#a16207'
                                : x.priority === 'Medium'
                                ? '#1e40af'
                                : '#6b7280',
                            backgroundColor:
                              x.priority === 'Critical'
                                ? '#fee2e2'
                                : x.priority === 'High'
                                ? '#fef3c7'
                                : x.priority === 'Medium'
                                ? '#dbeafe'
                                : '#f3f4f6',
                          }}
                        >
                          {x.priority}
                        </span>
                      </td>
                      <td style={tdLeft}>{x.status}</td>
                      <td style={{ ...tdLeft, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {x.findings || x.checklist || '—'}
                      </td>
                      <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                        <label
                          style={{
                            display: 'inline-block',
                            cursor: 'pointer',
                            marginRight: 8,
                          }}
                          title="Attach photo"
                        >
                          📷{' '}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: 'none' }}
                            onChange={e => void uploadEvidence(x, e.target.files?.[0])}
                          />
                        </label>
                        {x.status === 'Scheduled' && (
                          <button
                            className="btn"
                            style={{ marginRight: 6 }}
                            onClick={() => void startInspection(x)}
                          >
                            Start
                          </button>
                        )}
                        {x.status !== 'Completed' && (
                          <button
                            className="btn"
                            onClick={() => void update(x, 'Completed')}
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Recent photo evidence</h2>
          {evidence.length === 0 ? (
            <p className="muted" style={{ padding: '16px 0' }}>
              No evidence records loaded. Upload a photo from an inspection row.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thLeft}>Captured</th>
                    <th style={thLeft}>Block</th>
                    <th style={thLeft}>Inspection</th>
                    <th style={thLeft}>File</th>
                    <th style={thLeft}>Uploaded by</th>
                    <th style={thLeft}>Image</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map(e => (
                    <tr key={e._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdLeft}>{e.capturedAt?.slice(0, 10) ?? '—'}</td>
                      <td style={tdLeft}>{e.siteOrBlock}</td>
                      <td style={tdLeft}>{e.inspectionId}</td>
                      <td style={tdLeft}>{e.fileName}</td>
                      <td style={tdLeft}>{e.uploadedBy}</td>
                      <td style={tdLeft}>
                        <button className="btn" onClick={() => void openEvidence(e._id)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="panel"
          style={{
            borderLeft: '4px solid #f59e0b',
            backgroundColor: '#fffbeb',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 6 }}>
            📋 Operating rule
          </strong>
          <p className="muted" style={{ margin: 0 }}>
            Every inspection should record what was checked, what was found, what action is
            required and who owns the follow-up. An overdue status is calculated from the due
            date when records are listed; it is not yet a background notification.
          </p>
        </section>
      </main>
    </div>
  );
}

const thLeft: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontWeight: 600,
  fontSize: 13,
};
const tdLeft: React.CSSProperties = { padding: '10px 8px' };