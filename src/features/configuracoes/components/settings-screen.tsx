'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorRetry, Loader } from '@/components/load-state';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { signOut } from '@/features/auth/api';
import { useCurrentUser } from '@/features/auth/session';
import { ProfileForm } from '@/features/perfil/components/profile-form';
import { useMyProfile } from '@/features/perfil/hooks';
import {
  applyFontSize,
  applyTheme,
  FONT_SIZES,
  THEMES,
  type FontSize,
  type Theme,
} from '@/features/tema/theme';
import { t } from '@/i18n';
import { routes } from '@/lib/routes';
import { useSettings, useUpdateSettings } from '../hooks';

const themeOptions = THEMES.map((value) => ({ value, label: t.settings.theme[value] }));
const fontSizeOptions = FONT_SIZES.map((value) => ({ value, label: t.settings.fontSize[value] }));

function asTheme(value: string): Theme {
  return THEMES.find((theme) => theme === value) ?? 'dark';
}

function asFontSize(value: string): FontSize {
  return FONT_SIZES.find((size) => size === value) ?? 'medium';
}

export function SettingsScreen() {
  return (
    <section className="flex min-h-0 w-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-5 py-6">
        <h1 className="text-2xl font-semibold">{t.settings.title}</h1>
        <ProfileSection />
        <AppearanceSection />
        <AccountSection />
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSection() {
  const { data: profile } = useMyProfile();
  return (
    <Section title={t.settings.profileSection}>
      {profile ? <ProfileForm profile={profile} /> : <Loader />}
    </Section>
  );
}

function AppearanceSection() {
  const { data: settings, isError, refetch } = useSettings();
  const update = useUpdateSettings();

  return (
    <Section title={t.settings.appearanceSection}>
      {isError ? (
        <ErrorRetry onRetry={() => void refetch()} />
      ) : !settings ? (
        <Loader />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t.settings.theme.label}</p>
            <SegmentedControl
              label={t.settings.theme.label}
              value={asTheme(settings.theme)}
              options={themeOptions}
              onChange={(theme) => {
                applyTheme(theme);
                update.mutate({ theme });
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t.settings.fontSize.label}</p>
            <SegmentedControl
              label={t.settings.fontSize.label}
              value={asFontSize(settings.font_size)}
              options={fontSizeOptions}
              onChange={(fontSize) => {
                applyFontSize(fontSize);
                update.mutate({ font_size: fontSize });
              }}
            />
          </div>
          {update.isError ? (
            <p role="alert" className="text-sm text-danger">
              {t.errors.generic}
            </p>
          ) : null}
        </>
      )}
    </Section>
  );
}

function AccountSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setPending(true);
    setError(null);
    try {
      await signOut();
      queryClient.clear();
      router.replace(routes.welcome);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.errors.generic);
      setPending(false);
    }
  };

  return (
    <Section title={t.settings.accountSection}>
      <dl className="flex flex-col gap-1">
        <dt className="text-sm text-muted">{t.settings.account.email}</dt>
        <dd className="break-all">{user?.email}</dd>
      </dl>
      <p className="text-sm text-muted">{t.settings.account.signOutDescription}</p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        variant="danger"
        onClick={() => void handleSignOut()}
        loading={pending}
        className="self-start"
      >
        <LogOut className="size-4" aria-hidden="true" />
        {pending ? t.auth.signingOut : t.auth.signOut}
      </Button>
    </Section>
  );
}
