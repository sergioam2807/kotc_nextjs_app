'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-[#F5C344] text-[#080809] hover:bg-[#e8b53d] font-medium',
  ghost: 'bg-transparent text-[#888] border border-[#2a2a2a] hover:border-[#444] hover:text-[#ccc]',
  danger: 'bg-[#2a1515] text-[#E24B4A] hover:bg-[#3a1515]',
};

const sizeStyles = {
  sm: 'text-[11px] px-2.5 py-1 rounded-[6px]',
  md: 'text-[13px] px-4 py-2 rounded-[8px]',
  lg: 'text-[14px] px-6 py-3 rounded-[8px]',
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
