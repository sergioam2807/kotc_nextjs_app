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
  equipoRetadoColor = '#F5C344',
  cancha,
  fechaHora,
  onAceptar,
  onRechazar,
}: ChallengeCardProps) {
  return (
    <div className="bg-[#151518] border border-[#222] rounded-[10px] p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#888] bg-[#1e1e24] px-2 py-0.5 rounded-[4px] font-medium">{deporte}</span>
        <span className="text-[10px] text-[#F5C344] bg-[#F5C34420] px-2 py-0.5 rounded-[4px] font-medium">{modalidad}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#ddd]">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: equipoRetadorColor }} />
          {equipoRetadorNombre}
        </div>
        <span className="text-[11px] text-[#444]">vs</span>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#ddd]">
          {equipoRetadoNombre}
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: equipoRetadoColor }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#555] flex items-center gap-2.5">
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
