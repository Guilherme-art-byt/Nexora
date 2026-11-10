'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/features/auth/session';
import { AVATAR_URL_STALE_MS, createAvatarUrl, fetchMyProfile, isUsernameAvailable } from './api';
import { USERNAME_PATTERN } from './schemas';

export const profileKeys = {
  mine: (userId: string) => ['profile', 'mine', userId] as const,
  avatarUrl: (path: string) => ['avatar-url', path] as const,
  usernameAvailable: (username: string) => ['username-available', username] as const,
};

export function useMyProfile() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: profileKeys.mine(user?.id ?? ''),
    queryFn: () => fetchMyProfile(user?.id ?? ''),
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });
}

/** URL assinada (temporária) de uma foto de perfil. */
export function useAvatarUrl(path: string | null | undefined): string | null {
  const { data } = useQuery({
    queryKey: profileKeys.avatarUrl(path ?? ''),
    queryFn: () => createAvatarUrl(path ?? ''),
    enabled: Boolean(path),
    staleTime: AVATAR_URL_STALE_MS,
    gcTime: AVATAR_URL_STALE_MS,
  });
  return path ? (data ?? null) : null;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

/** Verifica a disponibilidade enquanto a pessoa digita. `current` é o usuário já salvo. */
export function useUsernameStatus(username: string, current?: string): UsernameStatus {
  const debounced = useDebounced(username, 350);
  const shouldCheck = USERNAME_PATTERN.test(debounced) && debounced !== current;

  const { data, isFetching } = useQuery({
    queryKey: profileKeys.usernameAvailable(debounced),
    queryFn: () => isUsernameAvailable(debounced),
    enabled: shouldCheck,
    staleTime: 10 * 1000,
  });

  if (!USERNAME_PATTERN.test(username) || username === current) return 'idle';
  if (username !== debounced || isFetching || data === undefined) return 'checking';
  return data ? 'available' : 'taken';
}
