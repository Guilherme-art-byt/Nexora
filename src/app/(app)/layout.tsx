import type { ReactNode } from 'react';
import { AppShell } from '@/features/casca/components/app-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
