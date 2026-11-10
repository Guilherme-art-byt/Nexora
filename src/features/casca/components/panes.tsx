import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/wordmark';
import { cn } from '@/lib/utils';

/** Coluna da esquerda (lista). No celular ocupa a tela toda. */
export function ListPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 w-full shrink-0 flex-col bg-background md:w-list-pane md:border-r">
      <header className="flex h-16 shrink-0 items-center px-5">
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </section>
  );
}

/** Coluna da direita (detalhe). Só existe a partir do tamanho de tablet. */
export function DetailPane({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('hidden min-h-0 min-w-0 flex-1 flex-col bg-surface md:flex', className)}>
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-raised text-accent">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xs text-pretty text-muted">{description}</p>
    </div>
  );
}

/** Painel de detalhe quando nada está selecionado. */
export function DetailPlaceholder({ description }: { description: string }) {
  return (
    <DetailPane className="items-center justify-center gap-4 px-8 text-center">
      <Wordmark />
      <p className="max-w-sm text-pretty text-muted">{description}</p>
    </DetailPane>
  );
}
