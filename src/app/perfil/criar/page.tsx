import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/auth-card';
import { CreateProfileScreen } from '@/features/perfil/components/create-profile-screen';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.profile.create.title };

export default function CreateProfilePage() {
  return (
    <AuthCard>
      <CreateProfileScreen />
    </AuthCard>
  );
}
