'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-overlay" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-dvh animate-pop-in flex-col gap-4 rounded-t-xl border bg-surface p-5 shadow-popover',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-lg font-semibold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-sm text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label={t.common.close}
              className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer ? <div className="flex justify-end gap-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
