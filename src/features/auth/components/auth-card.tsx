import type { ReactNode } from 'react';
import { Wordmark } from '@/components/wordmark';

/** Moldura das telas de entrada: marca no topo e conteúdo centralizado. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Wordmark />
        {children}
      </div>
    </main>
  );
}
