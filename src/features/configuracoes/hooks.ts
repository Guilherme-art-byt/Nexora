'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/session';
import { fetchSettings, updateSettings, type UserSettings, type UserSettingsPatch } from './api';

export const settingsKeys = {
  mine: (userId: string) => ['settings', userId] as const,
};

export function useSettings(enabled = true) {
  const user = useCurrentUser();
  return useQuery({
    queryKey: settingsKeys.mine(user?.id ?? ''),
    queryFn: () => fetchSettings(user?.id ?? ''),
    enabled: Boolean(user) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Atualiza configurações de forma otimista; desfaz se o servidor recusar. */
export function useUpdateSettings() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const key = settingsKeys.mine(user?.id ?? '');

  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => updateSettings(user?.id ?? '', patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserSettings>(key);
      if (previous) queryClient.setQueryData<UserSettings>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });
}
