'use client';

import { Button } from '@/components/ui/Button';

interface ChallengeCardProps {
  deporte: string;
  modalidad: string;
  equipoRetadorNombre: string;
  equipoRetadorColor?: string;
  equipoRetadoNombre: string;
  equipoRetadoColor?: string;
  cancha: string;
  fechaHora: string;
  onAceptar?: () => void;
  onRechazar?: () => void;
}

export function ChallengeCard({
  deporte,
  modalidad,
  equipoRetadorNombre,
  equipoRetadorColor = '#888',
  equipoRetadoNombre,
  equipoRetadoColor,
  cancha,
  fechaHora,
  onAceptar,
  onRechazar,
}: ChallengeCardProps) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide">
          {deporte}
        </span>
        <span className="text-[10px] text-accent bg-accent/15 px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide">
          {modalidad}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-on-surface">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: equipoRetadorColor }} />
          {equipoRetadorNombre}
        </div>
        <span className="text-[11px] text-outline">vs</span>
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-on-surface">
          {equipoRetadoNombre}
          {equipoRetadoColor && (
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: equipoRetadoColor }} />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-on-surface-variant flex items-center gap-2.5">
          <span>📍 {cancha}</span>
          <span>🕐 {fechaHora}</span>
        </div>
        {onAceptar && (
          <Button size="sm" onClick={onAceptar}>Aceptar</Button>
        )}
      </div>
    </div>
  );
}
