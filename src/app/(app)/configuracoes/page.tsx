import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/configuracoes/components/settings-screen';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.settings.title };

export default function SettingsPage() {
  return <SettingsScreen />;
}
