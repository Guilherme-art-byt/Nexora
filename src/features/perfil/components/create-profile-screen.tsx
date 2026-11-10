'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorRetry, Loader } from '@/components/load-state';
import { t } from '@/i18n';
import { routes } from '@/lib/routes';
import { useMyProfile } from '../hooks';
import { ProfileForm } from './profile-form';

export function CreateProfileScreen() {
  const router = useRouter();
  const { data: profile, isPending, isError, refetch } = useMyProfile();

  useEffect(() => {
    if (profile) router.replace(routes.conversations);
  }, [profile, router]);

  if (isError) return <ErrorRetry onRetry={() => void refetch()} />;
  if (isPending || profile) return <Loader />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t.profile.create.title}</h1>
        <p className="text-muted">{t.profile.create.subtitle}</p>
      </header>
      <ProfileForm profile={null} onSaved={() => router.replace(routes.conversations)} />
    </div>
  );
}
