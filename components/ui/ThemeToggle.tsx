'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('kotc-theme', theme);
}

interface Props {
  /** Clases Tailwind adicionales para ajustar el espaciado según contexto. */
  className?: string;
}

export function ThemeToggle({ className = '' }: Props) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('kotc-theme') as Theme | null;
    const initial: Theme = stored === 'light' ? 'light' : 'dark';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    if (!theme) return;
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  const isDark = theme !== 'light';

  return (
    // Tamaño 44×44px — cumple WCAG 2.5.5 (target size nivel AA)
    // opacity-0 durante SSR en lugar de null → evita layout shift
    <button
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-pressed={!isDark}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className={`
        flex items-center justify-center w-11 h-11 rounded-md
        text-on-surface-variant hover:text-on-surface hover:bg-surface-container
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        transition-colors cursor-pointer
        ${theme === null ? 'opacity-0 pointer-events-none' : ''}
        ${className}
      `}
    >
      {isDark ? (
        /* Sol — estás en dark, click activa light */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Luna — estás en light, click activa dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
