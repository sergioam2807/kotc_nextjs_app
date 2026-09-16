'use client';

import { Chip } from '@heroui/react';
import type { CSSProperties } from 'react';

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

/**
 * Wrapper delgado sobre Chip de HeroUI: preserva los mismos nombres de
 * variante que ya usan los 16 call-sites existentes, para no tocarlos.
 * El color/variant de HeroUI cubre accent/success/danger/default; primary
 * y purple no tienen color equivalente en HeroUI, así que se pisan las
 * custom properties --chip-bg/--chip-fg directamente con los tokens KOTC.
 */
const heroui: Record<BadgeVariant, { color: 'accent' | 'success' | 'danger' | 'default'; style?: CSSProperties }> = {
  accent:  { color: 'accent' },
  king:    { color: 'accent' },
  gold:    { color: 'accent' },
  green:   { color: 'success' },
  libre:   { color: 'success' },
  error:   { color: 'danger' },
  rival:   { color: 'danger' },
  red:     { color: 'danger' },
  neutral: { color: 'default' },
  primary: { color: 'default', style: { '--chip-bg': 'color-mix(in oklab, var(--primary) 15%, transparent)', '--chip-fg': 'var(--primary)' } as CSSProperties },
  blue:    { color: 'default', style: { '--chip-bg': 'color-mix(in oklab, var(--primary) 15%, transparent)', '--chip-fg': 'var(--primary)' } as CSSProperties },
  purple:  { color: 'default', style: { '--chip-bg': 'color-mix(in oklab, var(--status-purple) 15%, transparent)', '--chip-fg': 'var(--status-purple)' } as CSSProperties },
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const { color, style } = heroui[variant];
  return (
    <Chip color={color} variant="soft" size="sm" style={style} className={className}>
      {children}
    </Chip>
  );
}
