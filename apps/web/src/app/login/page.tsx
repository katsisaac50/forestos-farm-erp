'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/lib/session-context';
import { ApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { status, login } = useSession();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await login({
        email,
        password: passwordRef.current?.value ?? '',
      });

      if (result === 'authenticated') {
        router.push('/');
      } else if (result === 'unavailable') {
        setError('Your credentials could not be verified because the service is unavailable. Please try again.');
      } else {
        setError('Sign in could not be completed. Please try again.');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.kind === 'network' || e.status >= 500) {
          setError('ForestOS is unavailable. Check your connection and try again.');
        } else if (e.status === 401) {
          setError('Email or password is incorrect.');
        } else {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : 'Sign in failed');
      }
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