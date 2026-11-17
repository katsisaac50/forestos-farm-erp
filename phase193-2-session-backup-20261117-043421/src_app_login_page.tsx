'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (localStorage.getItem('forestos_token')) {
      router.replace('/');
    }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: passwordRef.current?.value ?? '',
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Sign in failed');

      localStorage.setItem('forestos_token', data.accessToken);
      localStorage.setItem('forestos_user', JSON.stringify(data.user));

      // Fetch org context and store it so tenant-scoped pages can send X-Organization-Id.
      try {
        const orgRes = await fetch(API + '/organization-access/mine', {
          headers: { Authorization: 'Bearer ' + data.accessToken },
        });
        if (orgRes.ok) {
          const orgs = await orgRes.json();
          const first = orgs?.organizations?.[0];
          if (first?.organizationId) {
            localStorage.setItem('forestos_organization_id', first.organizationId);
            localStorage.setItem('forestos_active_organization', first.organizationId);
          }
        }
      } catch {
        // Non-fatal: allow login to proceed even if org fetch fails.
      }

      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main" style={{ maxWidth: 520, margin: '8vh auto' }}>
      <section className="panel">
        <div className="brand">🌳 ForestOS</div>
        <h1 style={{ marginTop: 20 }}>Sign in</h1>
        <p className="muted">Use your authorised farm account.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              ref={passwordRef}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted">
          First-time owner setup is completed through the documented one-time API setup endpoint. Do not expose that setup key.
        </p>
      </section>
    </main>
  );
}