'use client';

import { Button, Card } from '@heroui/react';
import { Badge } from '@/components/ui/Badge';

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
    <Card variant="secondary" className="border border-outline-variant rounded-lg p-3 mb-2 gap-2">
      <Card.Header className="flex-row items-center justify-between">
        <Badge variant="neutral">{deporte}</Badge>
        <Badge variant="accent">{modalidad}</Badge>
      </Card.Header>
      <Card.Content className="flex-row items-center justify-between">
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
      </Card.Content>
      <Card.Footer className="justify-between">
        <div className="text-[11px] text-on-surface-variant flex items-center gap-2.5">
          <span>📍 {cancha}</span>
          <span>🕐 {fechaHora}</span>
        </div>
        {onAceptar && (
          <Button size="sm" onPress={onAceptar}>Aceptar</Button>
        )}
      </Card.Footer>
    </Card>
  );
}
