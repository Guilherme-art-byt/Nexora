'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase/client';

type SessionState =
  | { status: 'loading'; session: null }
  | { status: 'authenticated'; session: Session }
  | { status: 'unauthenticated'; session: null };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', session: null });

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setState(
        session
          ? { status: 'authenticated', session }
          : { status: 'unauthenticated', session: null },
      );
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  const state = use(SessionContext);
  if (!state) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return state;
}

/** Dados do usuário autenticado; `null` enquanto carrega ou sem sessão. */
export function useCurrentUser(): { id: string; email: string | null } | null {
  const { session } = useSession();
  const id = session?.user.id;
  const email = session?.user.email ?? null;
  return useMemo(() => (id ? { id, email } : null), [id, email]);
}
