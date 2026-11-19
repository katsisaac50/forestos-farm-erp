'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';

type ProtectedRouteGuardProps = {
  children: ReactNode;
};

export function ProtectedRouteGuard({
  children,
}: ProtectedRouteGuardProps) {
  const router = useRouter();
  const { status, refreshSession } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  if (status === 'unavailable') {
    return (
      <main className="main">
        <section className="panel">
          <h1>Session verification unavailable</h1>
          <p className="muted">
            ForestOS could not verify your session. Your saved credentials
            have been preserved. Check your connection and try again.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => void refreshSession()}
          >
            Retry session verification
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="panel">
        <p className="muted">
          {status === 'unauthenticated'
            ? 'Redirecting to sign in…'
            : 'Checking your session…'}
        </p>
      </section>
    </main>
  );
}