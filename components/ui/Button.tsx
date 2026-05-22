'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  /** CTA — Amarillo eléctrico de la marca */
  primary:
    'bg-accent text-on-accent hover:brightness-90 font-semibold',
  /** Outlined — Azul eléctrico */
  secondary:
    'bg-transparent text-primary border border-primary hover:bg-primary/10',
  /** Sin fondo */
  ghost:
    'bg-transparent text-on-surface-variant border border-outline-variant hover:border-outline hover:text-on-surface',
  /** Destructivo */
  danger:
    'bg-error-container text-error hover:bg-error-container/80',
};

const sizeStyles = {
  sm: 'text-[11px] px-2.5 py-1 rounded-md',
  md: 'text-[13px] px-4 py-2 rounded-md',
  lg: 'text-[14px] px-6 py-3 rounded-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
