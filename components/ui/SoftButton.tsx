'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@heroui/react';

type SoftButtonColor = 'green' | 'red' | 'accent' | 'primary';

interface SoftButtonProps {
  color: SoftButtonColor;
  children: ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * HeroUI no trae una variante "tintado suave" (bg al 15%, borde al 25%,
 * texto sólido) — patrón repetido a mano en varias acciones de KOTC
 * (aceptar/rechazar/confirmar/disputar desafíos). Wrapper delgado sobre
 * Button de HeroUI (variant="outline" como base estructural) que pisa
 * --button-bg/--button-fg y el color del borde con los tokens de marca.
 */
const TOKEN: Record<SoftButtonColor, string> = {
  green: 'var(--status-libre)',
  red: 'var(--error)',
  accent: 'var(--accent)',
  primary: 'var(--primary)',
};

export function SoftButton({ color, children, onPress, isDisabled, fullWidth, className = '' }: SoftButtonProps) {
  const t = TOKEN[color];
  const style: CSSProperties = {
    ['--button-bg' as string]: `color-mix(in oklab, ${t} 15%, transparent)`,
    ['--button-bg-hover' as string]: `color-mix(in oklab, ${t} 25%, transparent)`,
    ['--button-bg-pressed' as string]: `color-mix(in oklab, ${t} 25%, transparent)`,
    ['--button-fg' as string]: t,
    borderColor: `color-mix(in oklab, ${t} 25%, transparent)`,
  };

  return (
    <Button
      variant="outline"
      onPress={onPress}
      isDisabled={isDisabled}
      fullWidth={fullWidth}
      style={style}
      className={`font-semibold ${className}`}
    >
      {children}
    </Button>
  );
}
