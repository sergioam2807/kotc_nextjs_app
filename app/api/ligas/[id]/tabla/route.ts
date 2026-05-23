import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeTabla, computeTablaByGrupo } from '@/lib/ligas/tabla';

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/ligas/[id]/tabla — computed standings
// Returns { tipo: 'tabla' | 'grupos', tabla: StandingRow[] | Record<string, StandingRow[]> }
// For eliminacion_directa, standings are not applicable (returns empty).
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: liga } = await supabase
    .from('ligas')
    .select('formato, puntos_victoria, puntos_empate, puntos_derrota')
    .eq('id', id)
    .maybeSingle();
  if (!liga) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });

  if (liga.formato === 'eliminacion_directa') {
    return NextResponse.json({ tipo: 'bracket', tabla: [] });
  }

  const config = {
    puntos_victoria: liga.puntos_victoria,
    puntos_empate:   liga.puntos_empate,
    puntos_derrota:  liga.puntos_derrota,
  };

  const { data: ligaEquipos } = await supabase
    .from('liga_equipos')
    .select('equipo_id, grupo, equipos(id, nombre, color)')
    .eq('liga_id', id)
    .eq('estado', 'aceptado');

  const equipos = (ligaEquipos ?? []).map(le => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eqRaw = le.equipos as any;
    const eqObj = Array.isArray(eqRaw) ? eqRaw[0] : eqRaw;
    return {
      id:     le.equipo_id,
      nombre: (eqObj?.nombre as string) ?? '?',
      color:  (eqObj?.color  as string) ?? '#888',
      grupo:  le.grupo ?? undefined,
    };
  });

  const fasesTabla = liga.formato === 'grupos_playoffs'
    ? ['grupos']
    : ['regular'];

  const { data: partidos } = await supabase
    .from('liga_partidos')
    .select('equipo_local_id, equipo_visitante_id, puntos_local, puntos_visitante, estado, grupo')
    .eq('liga_id', id)
    .in('fase', fasesTabla);

  const rows = (partidos ?? []).map(p => ({ ...p, grupo: p.grupo ?? null }));

  if (liga.formato === 'grupos_playoffs') {
    const equiposGrupo = equipos.filter(e => e.grupo) as {
      id: string; nombre: string; color: string; grupo: string;
    }[];
    const tabla = computeTablaByGrupo(equiposGrupo, rows, config);
    return NextResponse.json({ tipo: 'grupos', tabla });
  }

  const tabla = computeTabla(equipos, rows, config);
  return NextResponse.json({ tipo: 'tabla', tabla });
}
