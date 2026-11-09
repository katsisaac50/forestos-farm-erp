'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getData, postData } from '@/lib/api';
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
type Organization = {
  _id: string;
  slug: string;
  name: string;
  status: string;
  baseCurrency: string;
  timezone: string;
  country: string;
  createdBy?: string;
  createdAt?: string;
};

type Membership = {
  _id: string;
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  addedBy?: string;
  createdAt?: string;
};

type AuditEvent = {
  _id: string;
  action: string;
  actor: string;
  reason?: string;
  createdAt?: string;
};

type OrgForm = {
  slug: string;
  name: string;
  baseCurrency: string;
  timezone: string;
  country: string;
  reason: string;
};

type MemberForm = {
  userId: string;
  role: string;
  reason: string;
};

const initialOrg: OrgForm = {
  slug: '',
  name: '',
  baseCurrency: 'UGX',
  timezone: 'Africa/Kampala',
  country: 'Uganda',
  reason: '',
};

const initialMember: MemberForm = {
  userId: '',
  role: 'manager',
  reason: '',
};

const ROLES = ['owner', 'admin', 'manager', 'field_worker', 'finance', 'viewer'];
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export default function OrganizationsPage() {
  const [items, setItems] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Membership[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [orgForm, setOrgForm] = useState<OrgForm>(initialOrg);
  const [memberForm, setMemberForm] = useState<MemberForm>(initialMember);
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const r = await getData<{ items: Organization[] }>('/organizations');
      setItems(r?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load organizations');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(o: Organization) {
    setSelected(o);
    setError('');
    try {
      const [m, a] = await Promise.all([
        getData<{ items: Membership[] }>(`/organizations/${o._id}/memberships`),
        getData<AuditEvent[]>(`/organizations/${o._id}/audit?limit=100`).catch(
          () => [] as AuditEvent[]
        ),
      ]);
      setMembers(m?.items ?? []);
      setAudit(Array.isArray(a) ? a : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load details');
    }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData('/organizations', orgForm);
      setNotice('Organization created. No membership was granted.');
      setOrgForm({ ...initialOrg });
      setOrgFormOpen(false);
      await load();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creation failed');
    } finally {
      setBusy(false);
    }
  }

  async function addMembership(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!OBJECT_ID_RE.test(memberForm.userId.trim())) {
      setError('User ID must be a valid 24-character Mongo ObjectId.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await postData('/organizations/memberships', {
        organizationId: selected._id,
        ...memberForm,
      });
      setNotice('Membership added.');
      setMemberForm({ ...initialMember });
      await choose(selected);
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Membership creation failed');
    } finally {
      setBusy(false);
    }
  }

  const activeOrgs = items.filter(o => o.status === 'active').length;
  const totalMemberships = selected ? members.length : 0;
  const totalAuditEvents = audit.length;

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
          ].map(([u, l]) => (
            <Link key={u} href={u}>
              {l}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, color: '#36764b', margin: '0 0 8px' }}>
          FORESTOS · ORGANIZATION REGISTRY
        </p>
        <h1 style={{ marginTop: 0 }}>Organization Registry</h1>
        <p className="muted" style={{ marginBottom: 24, maxWidth: 900 }}>
          A foundation for multiple farms and agribusiness organizations. Creating an
          organization does not grant access to its data — membership must be granted
          explicitly.
        </p>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}

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
            label="Organizations"
            value={String(items.length)}
            detail={`${activeOrgs} active`}
          />
          <MetricCard
            label="Selected organization"
            value={selected ? selected.slug : '—'}
            detail={selected ? selected.name : 'Click an organization to inspect'}
          />
          <MetricCard
            label="Memberships"
            value={selected ? String(totalMemberships) : '—'}
            detail={selected ? `in ${selected.slug}` : 'Not selected'}
          />
          <MetricCard
            label="Audit events"
            value={selected ? String(totalAuditEvents) : '—'}
            detail={selected ? 'for this organization' : 'Not selected'}
          />
        </div>

        {/* Create org — collapsible */}
        <CollapsibleSection
          title="Create organization"
          open={orgFormOpen}
          onToggle={() => setOrgFormOpen(o => !o)}
          actionLabel="+ New organization"
        >
          <form onSubmit={createOrg}>
            <FormSection title="Identity">
              <label>
                Unique slug *
                <input
                  value={orgForm.slug}
                  onChange={e => setOrgForm({ ...orgForm, slug: e.target.value })}
                  placeholder="forestos-demo-org"
                  required
                />
              </label>
              <label>
                Organization name *
                <input
                  value={orgForm.name}
                  onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                  placeholder="ForestOS Demo Org"
                  required
                />
              </label>
            </FormSection>

            <FormSection title="Regional settings">
              <label>
                Base currency
                <input
                  value={orgForm.baseCurrency}
                  onChange={e => setOrgForm({ ...orgForm, baseCurrency: e.target.value })}
                  placeholder="UGX"
                />
              </label>
              <label>
                Timezone
                <input
                  value={orgForm.timezone}
                  onChange={e => setOrgForm({ ...orgForm, timezone: e.target.value })}
                  placeholder="Africa/Kampala"
                />
              </label>
              <label>
                Country
                <input
                  value={orgForm.country}
                  onChange={e => setOrgForm({ ...orgForm, country: e.target.value })}
                  placeholder="Uganda"
                />
              </label>
            </FormSection>

            <label style={{ display: 'block', marginTop: 16 }}>
              Reason * (10–1000 characters, recorded in audit)
              <textarea
                value={orgForm.reason}
                onChange={e => setOrgForm({ ...orgForm, reason: e.target.value })}
                rows={3}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Why is this organization being created?"
                required
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy || orgForm.reason.trim().length < 10}>
                {busy ? 'Creating…' : 'Create organization'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setOrgFormOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        {/* Organization list */}
        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Registered organizations</h2>
            <button className="btn" onClick={() => void load()} disabled={busy}>
              {busy ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {items.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No organizations registered. Click + New organization to create the first one.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {items.map(o => {
                const active = selected?._id === o._id;
                return (
                  <button
                    key={o._id}
                    onClick={() => void choose(o)}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: 14,
                      backgroundColor: active ? '#f3f4f6' : 'white',
                      border: active ? '2px solid #1f2937' : '1px solid #e5e7eb',
                      borderRadius: 8,
                      font: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: 15 }}>{o.name}</strong>
                      <Badge label={o.status} tone={o.status === 'active' ? 'ok' : 'neutral'} />
                    </div>
                    <div style={{ ...mono, fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      {o.slug}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {o.baseCurrency} · {o.timezone} · {o.country}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Detail for selected */}
        {selected && (
          <>
            <section className="panel" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>Add membership · {selected.name}</h2>
              <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
                Memberships grant access to the organization&apos;s data. The user must already
                exist (created via <code>/api/auth/users</code>). User ID must be the 24-character
                Mongo ObjectId, not the email.
              </p>

              <form onSubmit={addMembership}>
                <FormSection title="Membership details">
                  <label>
                    User ID (Mongo ObjectId) *
                    <input
                      value={memberForm.userId}
                      onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })}
                      placeholder="6aec28339b731c98872ca3c2"
                      pattern="[a-fA-F0-9]{24}"
                      required
                    />
                  </label>
                  <label>
                    Role *
                    <select
                      value={memberForm.role}
                      onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                    >
                      {ROLES.map(r => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ gridColumn: 'span 2' }}>
                    Reason * (10–1000 characters)
                    <input
                      value={memberForm.reason}
                      onChange={e => setMemberForm({ ...memberForm, reason: e.target.value })}
                      placeholder="Grant owner access to the bootstrap user"
                      required
                    />
                  </label>
                </FormSection>

                <button
                  className="btn"
                  disabled={
                    busy ||
                    !memberForm.userId.trim() ||
                    memberForm.reason.trim().length < 10 ||
                    !OBJECT_ID_RE.test(memberForm.userId.trim())
                  }
                  style={{ marginTop: 12 }}
                >
                  {busy ? 'Adding…' : 'Add membership'}
                </button>
              </form>
            </section>

            <section className="panel" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>
                Memberships ({members.length})
              </h2>
              {members.length === 0 ? (
                <p className="muted">No memberships for this organization yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRow}>
                        <th style={thLeft}>User ID</th>
                        <th style={thLeft}>Role</th>
                        <th style={thLeft}>Status</th>
                        <th style={thLeft}>Added by</th>
                        <th style={thLeft}>Added at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(m => (
                        <tr key={m._id} style={bodyRow}>
                          <td style={{ ...tdLeft, ...mono }}>{m.userId}</td>
                          <td style={tdLeft}>
                            <Badge
                              label={m.role}
                              tone={
                                m.role === 'owner'
                                  ? 'ok'
                                  : m.role === 'admin'
                                  ? 'info'
                                  : 'neutral'
                              }
                            />
                          </td>
                          <td style={tdLeft}>
                            <Badge
                              label={m.status}
                              tone={m.status === 'active' ? 'ok' : 'neutral'}
                            />
                          </td>
                          <td style={{ ...tdLeft, ...mono, fontSize: 12 }}>{m.addedBy ?? '—'}</td>
                          <td style={{ ...tdLeft, fontSize: 13 }}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel" style={{ marginBottom: 16 }}>
              <h2 style={{ marginTop: 0 }}>Audit history ({audit.length})</h2>
              {audit.length === 0 ? (
                <p className="muted">No audit events for this organization yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={theadRow}>
                        <th style={thLeft}>When</th>
                        <th style={thLeft}>Action</th>
                        <th style={thLeft}>Actor</th>
                        <th style={thLeft}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((a, i) => (
                        <tr key={a._id ?? i} style={bodyRow}>
                          <td style={{ ...tdLeft, fontSize: 13, whiteSpace: 'nowrap' }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                          </td>
                          <td style={tdLeft}>
                            <Badge
                              label={a.action}
                              tone={
                                a.action.includes('created')
                                  ? 'ok'
                                  : a.action.includes('added')
                                  ? 'info'
                                  : 'neutral'
                              }
                            />
                          </td>
                          <td style={{ ...tdLeft, fontSize: 13, color: '#6b7280' }}>
                            {a.actor ?? '—'}
                          </td>
                          <td style={{ ...tdLeft, fontSize: 13 }}>{a.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* Production warning — updated to reflect current state */}
        <Callout title="Tenant isolation status (as of this session)">
          <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
            <li style={{ marginBottom: 6 }}>
              <strong>Verified tenant-scoped:</strong> plantations, hives, growth samples,
              inventory, finance, tasks — each was tested with cross-tenant and fake-org
              requests; all returned 404 as expected.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Uses inline fetch (unverified):</strong> photo-evidence, case-evidence,
              recovery-*, notification-policies, field-verification, field-work. These
              modules have not been audited for <code>X-Organization-Id</code> enforcement.
            </li>
            <li style={{ marginBottom: 6 }}>
              <strong>Also unverified:</strong> inspection, sales, procurement, and the
              financial-investigation cluster. Test before hosting independent customer
              organizations in this registry.
            </li>
          </ul>
          <p style={{ margin: '12px 0 0', fontSize: 13 }}>
            Do not host separate customer organizations in this registry until every
            collection above has been verified to enforce organization scope end-to-end.
          </p>
        </Callout>
      </main>
    </div>
  );
}