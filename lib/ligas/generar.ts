// =============================================================================
// Liga match-generation utilities
// =============================================================================

export interface PartidoInput {
  equipo_local_id: string;
  equipo_visitante_id: string;
  ronda: number;
  fase: string;
  grupo?: string;
}

// ---------------------------------------------------------------------------
// Round-robin — Berger / circle method
// Generates all matches: (n−1) rounds × n/2 matches per round.
// Bye matches are silently skipped.
// ---------------------------------------------------------------------------
export function generarRoundRobin(equipoIds: string[]): PartidoInput[] {
  const teams = [...equipoIds];
  if (teams.length % 2 !== 0) teams.push('__bye__');
  const n = teams.length;
  const matches: PartidoInput[] = [];
  const arr = [...teams];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const local = arr[i];
      const visitante = arr[n - 1 - i];
      if (local !== '__bye__' && visitante !== '__bye__') {
        matches.push({
          ronda: round + 1,
          fase: 'regular',
          equipo_local_id: local,
          equipo_visitante_id: visitante,
        });
      }
    }
    // Rotate: keep arr[0] fixed, rotate arr[1..n-1] clockwise
    const last = arr[n - 1];
    for (let i = n - 1; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = last;
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Elimination bracket — one round at a time.
// Round 1: seed #1 vs #N, #2 vs #N-1, …
// Subsequent rounds: call again with the winners array.
// ---------------------------------------------------------------------------
export function generarRondaEliminacion(
  equipoIds: string[],
  rondaNum: number,
  faseOverride?: string,
): PartidoInput[] {
  const teams = [...equipoIds];
  const n = teams.length;
  const totalRondas = Math.max(1, Math.ceil(Math.log2(n)));
  const fase = faseOverride ?? getFase(totalRondas - rondaNum + 1);

  const matches: PartidoInput[] = [];
  for (let i = 0; i < Math.floor(n / 2); i++) {
    matches.push({
      ronda: rondaNum,
      fase,
      equipo_local_id: teams[i],
      equipo_visitante_id: teams[n - 1 - i],
    });
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Group stage — round-robin within each group.
// equiposPorGrupo: { A: [id1, id2, …], B: [id3, id4, …], … }
// ---------------------------------------------------------------------------
export function generarPartidosGrupos(
  equiposPorGrupo: Record<string, string[]>,
): PartidoInput[] {
  const matches: PartidoInput[] = [];
  for (const [grupo, ids] of Object.entries(equiposPorGrupo)) {
    const rr = generarRoundRobin(ids).map(m => ({
      ...m,
      grupo,
      fase: 'grupos' as string,
    }));
    matches.push(...rr);
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Helper: fase label from rounds remaining until the final
// ---------------------------------------------------------------------------
function getFase(roundsRemaining: number): string {
  const map: Record<number, string> = {
    1: 'final',
    2: 'semifinal',
    3: 'cuartos',
    4: 'octavos',
  };
  return map[roundsRemaining] ?? 'ronda';
}
