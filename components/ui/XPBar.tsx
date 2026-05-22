'use client';

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
        <div className="w-14 h-1 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-1.5 bg-surface-container rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
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
