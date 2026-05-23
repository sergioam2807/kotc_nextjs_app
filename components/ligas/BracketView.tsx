import { PartidoCard } from './PartidoCard';

interface Equipo { id: string; nombre: string; color: string }

interface Partido {
  id: string;
  ronda: number;
  fase: string;
  estado: string;
  puntos_local?: number | null;
  puntos_visitante?: number | null;
  ganador_id?: string | null;
  equipo_local?: Equipo | null;
  equipo_visitante?: Equipo | null;
}

interface BracketViewProps {
  partidos: Partido[];
}

const FASE_ORDER: Record<string, number> = {
  octavos: 1, cuartos: 2, semifinal: 3, '3er_lugar': 4, final: 5, ronda: 0,
};

const FASE_LABEL: Record<string, string> = {
  octavos:   'Octavos de final',
  cuartos:   'Cuartos de final',
  semifinal: 'Semifinales',
  '3er_lugar': '3er y 4to lugar',
  final:     'Final',
};

export function BracketView({ partidos }: BracketViewProps) {
  if (partidos.length === 0) {
    return (
      <p className="text-[13px] text-on-surface-variant text-center py-6">
        El calendario eliminatorio aún no fue generado.
      </p>
    );
  }

  // Group by fase (ignore 'grupos' partidos — those are handled by TablaLiga)
  const bracket = partidos.filter(p => p.fase !== 'regular' && p.fase !== 'grupos');
  const byFase = new Map<string, Partido[]>();

  for (const p of bracket) {
    if (!byFase.has(p.fase)) byFase.set(p.fase, []);
    byFase.get(p.fase)!.push(p);
  }

  // Sort fases by logical order
  const fasesSorted = [...byFase.keys()].sort(
    (a, b) => (FASE_ORDER[a] ?? 99) - (FASE_ORDER[b] ?? 99)
  );

  return (
    <div className="flex flex-col gap-6">
      {fasesSorted.map(fase => (
        <div key={fase}>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">
            {FASE_LABEL[fase] ?? fase}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(byFase.get(fase) ?? []).map(p => (
              <PartidoCard key={p.id} partido={p} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
