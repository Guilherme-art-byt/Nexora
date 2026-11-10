'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const controlClass =
  'w-full rounded-lg border bg-surface px-4 text-base text-foreground placeholder:text-muted transition-colors hover:border-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-invalid:border-danger disabled:opacity-50';

type FieldShellProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Mensagem de estado não crítica (ex.: "disponível"), anunciada ao leitor de tela. */
  status?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
};

type TextFieldProps = FieldShellProps & Omit<ComponentProps<'input'>, 'id'>;

export function TextField({
  label,
  hint,
  error,
  status,
  trailing,
  leading,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null, `${id}-status`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
            {leading}
          </span>
        ) : null}
        <input
          id={id}
          className={cn(controlClass, 'h-12', leading && 'pl-9', trailing && 'pr-11', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span>
        ) : null}
      </div>
      <FieldMessages id={id} hint={hint} error={error} status={status} />
    </div>
  );
}

type TextAreaFieldProps = FieldShellProps & Omit<ComponentProps<'textarea'>, 'id'>;

export function TextAreaField({
  label,
  hint,
  error,
  status,
  className,
  ...props
}: TextAreaFieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null, `${id}-status`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        className={cn(controlClass, 'min-h-20 resize-none py-3', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <FieldMessages id={id} hint={hint} error={error} status={status} />
    </div>
  );
}

function FieldMessages({
  id,
  hint,
  error,
  status,
}: Pick<FieldShellProps, 'hint' | 'error' | 'status'> & { id: string }) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p id={`${id}-status`} aria-live="polite" className="text-sm text-muted empty:hidden">
        {error ? null : status}
      </p>
    </>
  );
}
