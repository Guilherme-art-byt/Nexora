import Link from 'next/link';
import { Wordmark } from '@/components/wordmark';
import { t } from '@/i18n';
import { routes } from '@/lib/routes';

export default function WelcomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <Wordmark />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-balance">{t.auth.welcome.title}</h1>
          <p className="text-pretty text-muted">{t.auth.welcome.subtitle}</p>
        </div>
        <Link
          href={routes.login}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary-deep px-6 text-base font-medium text-on-primary transition-colors hover:bg-primary-deep-hover"
        >
          {t.auth.welcome.start}
        </Link>
      </div>
    </main>
  );
}
