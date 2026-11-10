import { CircleDashed, MessageCircle, Phone, Settings, type LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { routes } from '@/lib/routes';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const navItems: readonly NavItem[] = [
  { href: routes.conversations, label: t.nav.conversations, icon: MessageCircle },
  { href: routes.updates, label: t.nav.updates, icon: CircleDashed },
  { href: routes.calls, label: t.nav.calls, icon: Phone },
  { href: routes.settings, label: t.nav.settings, icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
