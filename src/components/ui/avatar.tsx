/* eslint-disable @next/next/no-img-element -- URLs assinadas e temporárias; o otimizador de imagens não se aplica. */
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvatarProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export function Avatar({ src, alt, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-muted',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="size-full object-cover" draggable={false} />
      ) : (
        <UserRound className="size-1/2" role="img" aria-label={alt} />
      )}
    </span>
  );
}
