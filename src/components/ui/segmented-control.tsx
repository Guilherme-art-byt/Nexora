'use client';

import { RadioGroup } from 'radix-ui';
import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next);
        if (option) onChange(option.value);
      }}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border bg-surface p-1"
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'h-10 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:text-foreground',
            'data-[state=checked]:bg-primary-deep data-[state=checked]:text-on-primary',
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
