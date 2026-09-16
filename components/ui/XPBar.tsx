'use client';

import { ProgressBar } from '@heroui/react';
import {
  nombreNivel,
  porcentajeEnNivel,
  xpInicioNivel,
  xpSiguienteNivel,
  xpNecesarioEnNivel,
  MAX_NIVEL,
} from '@/lib/levels';

interface XPBarProps {
  xp: number;
  nivel: number;
  showLabel?: boolean;
  compact?: boolean;
}

export function XPBar({ xp, nivel, showLabel = true, compact = false }: XPBarProps) {
  const isMax = nivel >= MAX_NIVEL;
  const porcentaje = porcentajeEnNivel(xp, nivel);
  const inicio = xpInicioNivel(nivel);
  const siguiente = xpSiguienteNivel(nivel);
  const necesario = xpNecesarioEnNivel(nivel);
  const ganados = xp - inicio;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-accent font-semibold">Lv.{nivel}</span>
        <ProgressBar value={porcentaje} aria-label="Progreso de nivel" color="accent" className="w-14">
          <ProgressBar.Track className="h-1 rounded-full">
            <ProgressBar.Fill className="rounded-full" />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
    );
  }

  return (
    <div>
      <ProgressBar value={porcentaje} aria-label="Progreso de nivel" color="accent" className="mb-1">
        <ProgressBar.Track className="h-1.5 rounded-full">
          <ProgressBar.Fill className="rounded-full" />
        </ProgressBar.Track>
      </ProgressBar>
      {showLabel && (
        isMax ? (
          <p className="text-[10px] text-accent font-semibold">👑 Nivel máximo alcanzado</p>
        ) : (
          <p className="text-[10px] text-outline">
            {ganados.toLocaleString()} / {necesario.toLocaleString()} XP en nivel
            {' '}—{' '}
            <span className="text-on-surface-variant">{xp.toLocaleString()} XP total</span>
            {' '}— siguiente: <span className="text-accent">{nombreNivel(nivel + 1)}</span>
          </p>
        )
      )}
    </div>
  );
}
