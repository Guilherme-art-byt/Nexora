'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ErrorRetry, Loader } from '@/components/load-state';
import { useSession } from '@/features/auth/session';
import { useMyProfile } from '@/features/perfil/hooks';
import { ThemeSync } from '@/features/tema/components/theme-sync';
import { routes } from '@/lib/routes';
import { BottomBar, NavRail } from './navigation';

/**
 * Casca autenticada. Garante sessão e perfil antes de mostrar qualquer tela:
 * sem sessão → boas-vindas; sem perfil → criação de perfil.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const { data: profile, isPending, isError, refetch } = useMyProfile();

  const needsLogin = status === 'unauthenticated';
  const needsProfile = status === 'authenticated' && !isPending && !isError && profile === null;

  useEffect(() => {
    if (needsLogin) router.replace(routes.welcome);
    else if (needsProfile) router.replace(routes.createProfile);
  }, [needsLogin, needsProfile, router]);

  if (isError) {
    return <ErrorRetry className="h-dvh" onRetry={() => void refetch()} />;
  }
  if (!profile) {
    return <Loader className="h-dvh" />;
  }

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <ThemeSync />
      <NavRail />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      <BottomBar />
    </div>
  );
}
