'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  groupLabel: string;
  digitLabel: (position: number) => string;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
};

/** Campo de código com uma caixa por dígito; aceita colar e preenchimento automático. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  groupLabel,
  digitLabel,
  invalid,
  disabled,
  describedBy,
}: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const commit = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    inputs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  };

  const handleInput = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    // Preenchimento automático e colagem entregam vários dígitos de uma vez.
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length)).slice(
      0,
      length,
    );
    commit(next, index + digits.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        inputs.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft') {
      inputs.current[Math.max(0, index - 1)]?.focus();
    } else if (event.key === 'ArrowRight') {
      inputs.current[Math.min(length - 1, index + 1)]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    commit(pasted, pasted.replace(/\D/g, '').length);
  };

  return (
    <div role="group" aria-label={groupLabel} className="flex justify-between gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={value[index] ?? ''}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={digitLabel(index + 1)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            'h-14 w-full min-w-0 rounded-lg border bg-surface text-center text-2xl font-semibold text-foreground transition-colors',
            'hover:border-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
            'disabled:opacity-50 aria-invalid:border-danger',
          )}
        />
      ))}
    </div>
  );
}
