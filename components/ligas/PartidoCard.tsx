interface Equipo {
  id: string;
  nombre: string;
  color: string;
}

interface PartidoCardProps {
  partido: {
    id: string;
    ronda: number;
    fase: string;
    grupo?: string | null;
    estado: string;
    fecha?: string | null;
    puntos_local?: number | null;
    puntos_visitante?: number | null;
    ganador_id?: string | null;
    equipo_local?: Equipo | null;
    equipo_visitante?: Equipo | null;
  };
  compact?: boolean;
}

function TeamSlot({
  equipo,
  puntos,
  esGanador,
  color,
}: {
  equipo?: Equipo | null;
  puntos?: number | null;
  esGanador: boolean;
  color?: string;
}) {
  const iniciales = equipo
    ? equipo.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  const c = equipo?.color ?? color ?? '#888';

  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${esGanador ? 'opacity-100' : 'opacity-60'}`}>
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: `${c}20`, color: c }}
      >
        {iniciales}
      </div>
      <span className={`text-[13px] truncate ${esGanador ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
        {equipo?.nombre ?? 'Por definir'}
      </span>
    </div>
  );
}

export function PartidoCard({ partido, compact = false }: PartidoCardProps) {
  const completado = partido.estado === 'completado';
  const hayPuntos  = completado && partido.puntos_local !== null && partido.puntos_visitante !== null;
  const esLocalGanador     = hayPuntos && partido.ganador_id === partido.equipo_local?.id;
  const esVisitanteGanador = hayPuntos && partido.ganador_id === partido.equipo_visitante?.id;

  const faseLabel: Record<string, string> = {
    regular: `J${partido.ronda}`,
    grupos:  `J${partido.ronda} · Gr. ${partido.grupo ?? ''}`,
    octavos:   'Octavos',
    cuartos:   'Cuartos',
    semifinal: 'Semifinal',
    '3er_lugar': '3er lugar',
    final:     'Final',
  };
  const label = faseLabel[partido.fase] ?? partido.fase;

  return (
    <div className={`bg-surface-container-low border border-outline-variant rounded-xl ${compact ? 'p-3' : 'p-3.5'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium">
          {label}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
          completado
            ? 'bg-status-libre/15 text-status-libre'
            : 'bg-surface-container text-on-surface-variant'
        }`}>
          {completado ? 'Completado' : 'Pendiente'}
        </span>
      </div>

      {/* Match */}
      <div className="flex items-center gap-2">
        <TeamSlot
          equipo={partido.equipo_local}
          puntos={partido.puntos_local}
          esGanador={!completado || esLocalGanador || (!esLocalGanador && !esVisitanteGanador)}
        />

        {/* Score */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {hayPuntos ? (
            <>
              <span className={`text-[16px] font-bold w-6 text-right ${esLocalGanador ? 'text-status-libre' : 'text-on-surface'}`}>
                {partido.puntos_local}
              </span>
              <span className="text-[12px] text-outline">–</span>
              <span className={`text-[16px] font-bold w-6 text-left ${esVisitanteGanador ? 'text-status-libre' : 'text-on-surface'}`}>
                {partido.puntos_visitante}
              </span>
            </>
          ) : (
            <span className="text-[13px] text-outline font-medium px-1">vs</span>
          )}
        </div>

        <div className="flex-1 flex justify-end">
          <TeamSlot
            equipo={partido.equipo_visitante}
            puntos={partido.puntos_visitante}
            esGanador={!completado || esVisitanteGanador || (!esLocalGanador && !esVisitanteGanador)}
          />
        </div>
      </div>

      {/* Date */}
      {!compact && partido.fecha && (
        <div className="mt-2 text-[10px] text-outline">
          {new Date(partido.fecha).toLocaleDateString('es-CL', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}
