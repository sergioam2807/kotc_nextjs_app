'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Valor final. Es lo que se renderiza si no hay animación. */
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  /** Retraso de entrada, para coreografiar con `--kotc-stagger`. */
  delayMs?: number;
  className?: string;
}

/**
 * Número que sube hasta su valor.
 *
 * Renderiza el valor final desde el primer frame y recién después lo baja a 0
 * para animarlo: si el efecto no corre (sin JS, `prefers-reduced-motion`, un
 * error), lo que queda en pantalla es el número correcto y no un 0 congelado.
 * La curva es la misma del sistema de motion (deceleración, sin rebote).
 */
export function CountUp({ value, prefix = '', suffix = '', durationMs = 900, delayMs = 0, className }: Props) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let start: number | null = null;
    setDisplay(0);

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start - delayMs) / durationMs);
      if (t < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, delayMs]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString('es-CL')}
      {suffix}
    </span>
  );
}
