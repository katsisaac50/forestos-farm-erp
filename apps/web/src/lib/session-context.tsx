'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, getData } from '@/lib/api';

export type SessionStatus =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'unavailable';

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type SessionContextValue = {
  status: SessionStatus;
  user: SessionUser | null;
  refreshSession: () => Promise<SessionStatus>;
  login: (credentials: LoginCredentials) => Promise<SessionStatus>;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const API =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function clearAuthentication() {
  localStorage.removeItem('forestos_token');
  localStorage.removeItem('forestos_user');
  localStorage.removeItem('forestos_organization_id');
  localStorage.removeItem('forestos_active_organization');
}

function readCachedUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem('forestos_user');
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);

    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'email' in value &&
      'role' in value &&
      typeof value.id === 'string' &&
      typeof value.email === 'string' &&
      typeof value.role === 'string'
    ) {
      return value as SessionUser;
    }
  } catch {
    // Cached display data is optional and never authenticates a user.
  }

  return null;
}

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [user, setUser] = useState<SessionUser | null>(null);
  const requestVersion = useRef(0);

  const refreshSession = useCallback(async (): Promise<SessionStatus> => {
    const version = ++requestVersion.current;

    let token: string | null;

    try {
      token = localStorage.getItem('forestos_token');
    } catch {
      if (version === requestVersion.current) {
        setUser(null);
        setStatus('unavailable');
      }
      return 'unavailable';
    }

    if (!token) {
      if (version === requestVersion.current) {
        setUser(null);
        setStatus('unauthenticated');
      }
      return 'unauthenticated';
    }

    if (version === requestVersion.current) {
      setStatus('checking');
      setUser(null);
    }

    try {
      const authenticatedUser = await getData<SessionUser>('/auth/me');

      if (version !== requestVersion.current) return 'checking';

      if (
        !authenticatedUser ||
        typeof authenticatedUser.id !== 'string' ||
        typeof authenticatedUser.email !== 'string' ||
        typeof authenticatedUser.role !== 'string'
      ) {
        setUser(null);
        setStatus('unavailable');
        return 'unavailable';
      }

      setUser(authenticatedUser);

      try {
        localStorage.setItem(
          'forestos_user',
          JSON.stringify(authenticatedUser),
        );
      } catch {
        // Session validation must not depend on cached user storage.
      }

      setStatus('authenticated');
      return 'authenticated';
    } catch (error) {
      if (version !== requestVersion.current) return 'checking';

      if (error instanceof ApiError && error.status === 401) {
        clearAuthentication();
        setUser(null);
        setStatus('unauthenticated');
        return 'unauthenticated';
      }

      // Preserve potentially valid credentials during network/server failure.
      setUser(null);
      setStatus('unavailable');
      return 'unavailable';
    }
  }, []);

  const login = useCallback(
    async ({
      email,
      password,
    }: LoginCredentials): Promise<SessionStatus> => {
      let response: Response;

      try {
        response = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      } catch {
        throw new ApiError(
          0,
          'Unable to reach ForestOS. Check your connection and try again.',
          'network',
        );
      }

      const responseData: unknown = await response.json().catch(() => null);

      const payload =
        typeof responseData === 'object' && responseData !== null
          ? (responseData as Record<string, unknown>)
          : {};

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError(401, 'Email or password is incorrect.');
        }

        if (response.status >= 500) {
          throw new ApiError(
            response.status,
            'ForestOS is temporarily unavailable. Please try again.',
          );
        }

        const message =
          typeof payload.message === 'string'
            ? payload.message
            : 'Sign in failed. Check your details and try again.';

        throw new ApiError(response.status, message);
      }

      const accessToken = payload.accessToken;

      const responseUser =
        typeof payload.user === 'object' && payload.user !== null
          ? (payload.user as Record<string, unknown>)
          : null;

      if (
        typeof accessToken !== 'string' ||
        !accessToken ||
        !responseUser ||
        typeof responseUser.id !== 'string' ||
        typeof responseUser.email !== 'string' ||
        typeof responseUser.role !== 'string'
      ) {
        throw new Error('The server returned an invalid login response.');
      }

      // A successful login starts a new authentication context.
      clearAuthentication();

      localStorage.setItem('forestos_token', accessToken);
      localStorage.setItem('forestos_user', JSON.stringify(responseUser));

      const result = await refreshSession();

      if (result === 'authenticated') {
        // Organisation discovery is non-fatal; full selection is Phase 193.3.
        try {
          const orgResponse = await fetch(
            `${API}/organization-access/mine`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (orgResponse.ok) {
            const orgs = await orgResponse.json();
            const organizationId =
              orgs?.organizations?.[0]?.organizationId;

            if (typeof organizationId === 'string' && organizationId) {
              localStorage.setItem(
                'forestos_organization_id',
                organizationId,
              );
              localStorage.setItem(
                'forestos_active_organization',
                organizationId,
              );
            }
          }
        } catch {
          // Do not turn a verified login into a failure.
        }
      }

      return result;
    },
    [refreshSession],
  );

  const logout = useCallback(() => {
    // Invalidate any pending validation request.
    requestVersion.current += 1;

    clearAuthentication();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    void refreshSession();

    return () => {
      requestVersion.current += 1;
    };
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      status,
      user,
      refreshSession,
      login,
      logout,
    }),
    [status, user, refreshSession, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider.');
  }

  return context;
}