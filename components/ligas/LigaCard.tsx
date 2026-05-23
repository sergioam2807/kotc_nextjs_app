import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface LigaCardProps {
  liga: {
    id: string;
    nombre: string;
    deporte: string;
    modalidad: string;
    formato: string;
    estado: string;
    max_equipos: number;
    fecha_inicio?: string | null;
    fecha_fin?: string | null;
    inscripcion_publica: boolean;
    liga_equipos?: { count: number }[] | [{ count: number }];
  };
  esOrganizador?: boolean;
}

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀', futbol: '⚽', voleibol: '🏐', tenis: '🎾', padel: '🏓',
};

const FORMATO_LABEL: Record<string, string> = {
  round_robin:           'Liga todos vs todos',
  eliminacion_directa:   'Eliminación directa',
  grupos_playoffs:       'Grupos + playoffs',
};

const ESTADO_VARIANT: Record<string, 'accent' | 'green' | 'neutral' | 'primary' | 'error'> = {
  borrador:      'neutral',
  inscripciones: 'primary',
  en_curso:      'green',
  finalizada:    'neutral',
  cancelada:     'error',
};

const ESTADO_LABEL: Record<string, string> = {
  borrador:      'Borrador',
  inscripciones: 'Inscripciones abiertas',
  en_curso:      'En curso',
  finalizada:    'Finalizada',
  cancelada:     'Cancelada',
};

export function LigaCard({ liga, esOrganizador }: LigaCardProps) {
  // Supabase returns count as [{ count: N }]
  const count = Array.isArray(liga.liga_equipos)
    ? (liga.liga_equipos[0] as { count: number })?.count ?? 0
    : 0;

  const emoji = DEPORTE_EMOJI[liga.deporte] ?? '🏟️';

  return (
    <Link href={`/ligas/${liga.id}`} className="block group">
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors">
        <div className="flex items-start gap-3">
          {/* Sport emoji */}
          <div className="text-[28px] flex-shrink-0 mt-0.5">{emoji}</div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[15px] font-semibold text-on-surface truncate">{liga.nombre}</span>
              {esOrganizador && (
                <span className="text-[10px] text-accent font-medium">✎ Mi liga</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge variant={ESTADO_VARIANT[liga.estado] ?? 'neutral'}>
                {ESTADO_LABEL[liga.estado] ?? liga.estado}
              </Badge>
              <Badge variant="neutral">{liga.modalidad}</Badge>
              <Badge variant="neutral">{FORMATO_LABEL[liga.formato] ?? liga.formato}</Badge>
              {liga.inscripcion_publica && liga.estado === 'inscripciones' && (
                <Badge variant="primary">Abierta al público</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant">
                {count} / {liga.max_equipos} equipos
              </span>
              {liga.fecha_inicio && liga.fecha_fin && (
                <span className="text-[11px] text-outline">
                  {new Date(liga.fecha_inicio).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(liga.fecha_fin).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
