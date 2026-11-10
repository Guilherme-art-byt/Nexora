import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/auth-card';
import { LoginFlow } from '@/features/auth/components/login-flow';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.auth.login.title };

export default function LoginPage() {
  return (
    <AuthCard>
      <LoginFlow />
    </AuthCard>
  );
}
