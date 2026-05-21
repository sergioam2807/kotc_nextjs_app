'use client';

import { Badge } from '@/components/ui/Badge';

interface CourtCardProps {
  nombre: string;
  estado: 'king' | 'libre' | 'rival';
  equipoNombre?: string;
  equipoColor?: string;
  record?: string;
  modalidad?: string;
  deporte?: string;
}

export function CourtCard({
  nombre,
  estado,
  equipoNombre,
  equipoColor = '#444',
  record,
  modalidad,
  deporte,
}: CourtCardProps) {
  return (
    <div
      className={`bg-[#0f0f12] border rounded-[10px] p-3 cursor-pointer transition-colors hover:border-[#333] ${
        estado === 'king' ? 'border-[#F5C34430]' : 'border-[#1e1e24]'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[12px] text-[#ccc] font-medium leading-tight">{nombre}</span>
        <Badge variant={estado === 'king' ? 'king' : estado === 'libre' ? 'libre' : 'rival'}>
          {estado === 'king' ? 'KING' : estado === 'libre' ? 'LIBRE' : 'RIVAL'}
        </Badge>
      </div>
      {equipoNombre && (
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: equipoColor }}
          />
          <span className="text-[11px] text-[#666]">{equipoNombre}</span>
        </div>
      )}
      {(record || modalidad || deporte) && (
        <div className="text-[10px] text-[#444]">
          {[record, modalidad, deporte].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}
