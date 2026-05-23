// =============================================================================
// Standings computation for league tables
// =============================================================================

export interface StandingRow {
  equipo_id: string;
  nombre: string;
  color: string;
  PJ: number; // played
  PG: number; // won
  PE: number; // drawn
  PP: number; // lost
  GF: number; // goals / points for
  GC: number; // goals / points against
  GD: number; // difference
  Pts: number; // table points
  grupo?: string;
}

interface PartidoRow {
  equipo_local_id: string | null;
  equipo_visitante_id: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  estado: string;
  grupo?: string | null;
}

interface LigaConfig {
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
}

// ---------------------------------------------------------------------------
// Compute standings for a flat list of teams (round-robin or filtered group)
// ---------------------------------------------------------------------------
export function computeTabla(
  equipos: { id: string; nombre: string; color: string; grupo?: string }[],
  partidos: PartidoRow[],
  config: LigaConfig,
  grupoFilter?: string,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  for (const e of equipos) {
    if (grupoFilter !== undefined && e.grupo !== grupoFilter) continue;
    rows.set(e.id, {
      equipo_id: e.id,
      nombre: e.nombre,
      color: e.color,
      PJ: 0, PG: 0, PE: 0, PP: 0,
      GF: 0, GC: 0, GD: 0, Pts: 0,
      grupo: e.grupo,
    });
  }

  for (const p of partidos) {
    if (p.estado !== 'completado') continue;
    if (p.puntos_local === null || p.puntos_visitante === null) continue;
    if (!p.equipo_local_id || !p.equipo_visitante_id) continue;
    if (grupoFilter !== undefined && p.grupo !== grupoFilter) continue;

    const local = rows.get(p.equipo_local_id);
    const vis   = rows.get(p.equipo_visitante_id);
    if (!local || !vis) continue;

    local.PJ++; vis.PJ++;
    local.GF += p.puntos_local;   local.GC += p.puntos_visitante;
    vis.GF   += p.puntos_visitante; vis.GC += p.puntos_local;
    local.GD  = local.GF - local.GC;
    vis.GD    = vis.GF   - vis.GC;

    if (p.puntos_local > p.puntos_visitante) {
      local.PG++; local.Pts += config.puntos_victoria;
      vis.PP++;   vis.Pts   += config.puntos_derrota;
    } else if (p.puntos_local < p.puntos_visitante) {
      vis.PG++;   vis.Pts   += config.puntos_victoria;
      local.PP++; local.Pts += config.puntos_derrota;
    } else {
      local.PE++; local.Pts += config.puntos_empate;
      vis.PE++;   vis.Pts   += config.puntos_empate;
    }
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD  !== a.GD)  return b.GD  - a.GD;
    return b.GF - a.GF;
  });
}

// ---------------------------------------------------------------------------
// Compute standings per group (grupos_playoffs format)
// ---------------------------------------------------------------------------
export function computeTablaByGrupo(
  equipos: { id: string; nombre: string; color: string; grupo: string }[],
  partidos: PartidoRow[],
  config: LigaConfig,
): Record<string, StandingRow[]> {
  const grupos = [...new Set(equipos.map(e => e.grupo))].sort();
  const result: Record<string, StandingRow[]> = {};
  for (const grupo of grupos) {
    result[grupo] = computeTabla(equipos, partidos, config, grupo);
  }
  return result;
}
