'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/wordmark';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { isActive, navItems } from '../navigation';

/** Celular: barra inferior com as quatro seções. */
export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.nav.label}
      className="flex shrink-0 border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-bottom-bar flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              active ? 'text-accent' : 'text-muted hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-14 items-center justify-center rounded-full transition-colors',
                active && 'bg-primary-deep text-on-primary',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop: trilho lateral só com ícones. */
export function NavRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={t.nav.label}
      className="hidden w-nav-rail shrink-0 flex-col items-center gap-2 border-r bg-surface py-4 md:flex"
    >
      <Wordmark compact className="mb-4" />
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex size-12 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-primary-deep text-on-primary'
                : 'text-muted hover:bg-surface-raised hover:text-foreground',
            )}
          >
            <Icon className="size-6" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
