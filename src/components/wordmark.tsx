import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/** Marca do NEXORA: símbolo próprio (N com ponto lilás) e nome. */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" role="img" aria-label={t.app.name}>
        <rect width="40" height="40" rx="12" className="fill-primary-deep" />
        <path
          d="M12 28V12l16 16V12"
          fill="none"
          className="stroke-on-primary"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="12" r="3" className="fill-accent" />
      </svg>
      {compact ? null : (
        <span className="text-xl font-bold tracking-[0.18em] text-foreground">{t.app.name}</span>
      )}
    </span>
  );
}
