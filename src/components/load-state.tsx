import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center p-10 text-muted', className)}
    >
      <Spinner />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}

export function ErrorRetry({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-4 p-10 text-center', className)}
    >
      <p className="text-danger">{t.errors.generic}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t.common.retry}
      </Button>
    </div>
  );
}
