import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary-deep text-on-primary hover:bg-primary-deep-hover',
        secondary: 'border bg-surface-raised text-foreground hover:border-primary',
        ghost: 'text-foreground hover:bg-surface-raised',
        danger: 'bg-danger-surface text-danger hover:brightness-110',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11',
        inline: 'h-auto p-0 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}
