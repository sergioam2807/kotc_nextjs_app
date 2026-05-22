'use client';

type BadgeVariant =
  | 'accent'
  | 'primary'
  | 'green'
  | 'error'
  | 'purple'
  | 'neutral'
  | 'king'
  | 'libre'
  | 'rival'
  /* aliases legacy */
  | 'gold'
  | 'blue'
  | 'red';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  // Semánticos nuevos
  accent:  'bg-accent/15 text-accent',
  primary: 'bg-primary/15 text-primary',
  green:   'bg-status-libre/15 text-status-libre',
  error:   'bg-error/15 text-error',
  purple:  'bg-status-purple/15 text-status-purple',
  neutral: 'bg-surface-container text-on-surface-variant',
  // Game-specific
  king:    'bg-accent/15 text-accent',
  libre:   'bg-status-libre/15 text-status-libre',
  rival:   'bg-status-rival/15 text-status-rival',
  // Aliases legacy
  gold:    'bg-accent/15 text-accent',
  blue:    'bg-primary/15 text-primary',
  red:     'bg-error/15 text-error',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
