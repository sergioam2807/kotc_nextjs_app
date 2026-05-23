import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generarRoundRobin,
  generarRondaEliminacion,
  generarPartidosGrupos,
  type PartidoInput,
} from '@/lib/ligas/generar';
import { computeTablaByGrupo } from '@/lib/ligas/tabla';

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/ligas/[id]/generar
// Generates the match schedule based on the liga's formato.
//   round_robin        → all matches at once
//   eliminacion_directa→ one round at a time (call repeatedly for next rounds)
//   grupos_playoffs    → body.fase: 'grupos' | 'playoffs'
// Transitions liga to 'en_curso' when generating for the first time.
// ---------------------------------------------------------------------------
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select(
      'organizador_id, estado, formato, max_equipos, num_grupos, equipos_clasifican, puntos_victoria, puntos_empate, puntos_derrota',
    )
    .eq('id', id)
    .maybeSingle();

  if (!liga)                         return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
  if (liga.organizador_id !== user.id) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  if (!['inscripciones', 'en_curso'].includes(liga.estado)) {
    return NextResponse.json({ error: 'No se puede generar el calendario en este estado' }, { status: 400 });
  }

  // Fetch accepted teams (ordered by seed, then creation)
  const { data: ligaEquipos } = await supabase
    .from('liga_equipos')
    .select('equipo_id, grupo, seed, equipos(id, nombre, color)')
    .eq('liga_id', id)
    .eq('estado', 'aceptado')
    .order('seed', { ascending: true, nullsFirst: false })
    .order('created_at');

  const equipoIds = (ligaEquipos ?? []).map(le => le.equipo_id);
  if (equipoIds.length < 2) {
    return NextResponse.json({ error: 'Se necesitan al menos 2 equipos aceptados' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  let matches: PartidoInput[] = [];

  // -------------------------------------------------------------------------
  // Round-robin: generate all matches (once)
  // -------------------------------------------------------------------------
  if (liga.formato === 'round_robin') {
    const { count } = await supabase
      .from('liga_partidos')
      .select('id', { count: 'exact', head: true })
      .eq('liga_id', id);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'El calendario ya fue generado para esta liga' }, { status: 409 });
    }
    matches = generarRoundRobin(equipoIds);

  // -------------------------------------------------------------------------
  // Eliminación directa: one round at a time
  // -------------------------------------------------------------------------
  } else if (liga.formato === 'eliminacion_directa') {
    const { data: existing } = await supabase
      .from('liga_partidos')
      .select('ronda, estado, ganador_id')
      .eq('liga_id', id)
      .order('ronda', { ascending: false });

    if (!existing || existing.length === 0) {
      // First call: generate round 1 from the accepted team list
      matches = generarRondaEliminacion(equipoIds, 1);
    } else {
      const maxRonda = Math.max(...existing.map(m => m.ronda));
      const rondaActual = existing.filter(m => m.ronda === maxRonda);
      const allComplete = rondaActual.every(m => m.estado === 'completado');

      if (!allComplete) {
        return NextResponse.json({ error: 'La ronda actual no está completa aún' }, { status: 400 });
      }

      const winners = rondaActual
        .map(m => m.ganador_id)
        .filter(Boolean) as string[];

      if (winners.length <= 1) {
        return NextResponse.json({ error: 'La liga ya tiene un ganador' }, { status: 409 });
      }

      matches = generarRondaEliminacion(winners, maxRonda + 1);
    }

  // -------------------------------------------------------------------------
  // Grupos + playoffs: two phases
  // -------------------------------------------------------------------------
  } else if (liga.formato === 'grupos_playoffs') {
    const { data: existing } = await supabase
      .from('liga_partidos')
      .select('id, fase, ronda, estado, grupo, equipo_local_id, equipo_visitante_id, puntos_local, puntos_visitante, ganador_id')
      .eq('liga_id', id);

    const existingFases = new Set((existing ?? []).map(m => m.fase));
    const fasePedida = (body.fase as string) ?? (existingFases.has('grupos') ? 'playoffs' : 'grupos');

    if (fasePedida === 'grupos') {
      if (existingFases.has('grupos')) {
        return NextResponse.json({ error: 'La fase de grupos ya fue generada' }, { status: 409 });
      }
      // Build group map from liga_equipos.grupo
      const equiposPorGrupo: Record<string, string[]> = {};
      for (const le of ligaEquipos ?? []) {
        const grupo = le.grupo ?? 'A';
        if (!equiposPorGrupo[grupo]) equiposPorGrupo[grupo] = [];
        equiposPorGrupo[grupo].push(le.equipo_id);
      }
      if (Object.values(equiposPorGrupo).some(ids => ids.length < 2)) {
        return NextResponse.json({ error: 'Cada grupo necesita al menos 2 equipos' }, { status: 400 });
      }
      matches = generarPartidosGrupos(equiposPorGrupo);

    } else {
      // Playoffs: build table per group and take top N
      const partidosGrupos = (existing ?? []).filter(m => m.fase === 'grupos');
      const allGroupsComplete = partidosGrupos.length > 0 &&
        partidosGrupos.every(m => m.estado === 'completado');

      if (!allGroupsComplete) {
        return NextResponse.json({ error: 'No todos los partidos de grupos están completados' }, { status: 400 });
      }

      const equiposConGrupo = (ligaEquipos ?? [])
        .filter(le => le.grupo)
        .map(le => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eqRaw = le.equipos as any;
          const eqObj = Array.isArray(eqRaw) ? eqRaw[0] : eqRaw;
          return {
            id:     le.equipo_id,
            nombre: (eqObj?.nombre as string) ?? '',
            color:  (eqObj?.color  as string) ?? '#888',
            grupo:  le.grupo!,
          };
        });

      const tablaByGrupo = computeTablaByGrupo(
        equiposConGrupo,
        partidosGrupos.map(p => ({ ...p, grupo: p.grupo ?? null })),
        { puntos_victoria: liga.puntos_victoria, puntos_empate: liga.puntos_empate, puntos_derrota: liga.puntos_derrota },
      );

      const clasifican = liga.equipos_clasifican ?? 2;
      const clasificados: string[] = [];
      for (const rows of Object.values(tablaByGrupo)) {
        clasificados.push(...rows.slice(0, clasifican).map(r => r.equipo_id));
      }

      if (clasificados.length < 2) {
        return NextResponse.json({ error: 'No hay suficientes clasificados para el playoff' }, { status: 400 });
      }

      const rondaPlayoffs = Math.max(0, ...(existing ?? []).filter(m => m.fase !== 'grupos').map(m => m.ronda));
      if (rondaPlayoffs > 0) {
        // Next playoff round
        const ultimaRonda = (existing ?? []).filter(m => m.ronda === rondaPlayoffs && m.fase !== 'grupos');
        if (!ultimaRonda.every(m => m.estado === 'completado')) {
          return NextResponse.json({ error: 'La ronda de playoffs actual no está completa' }, { status: 400 });
        }
        const winners = ultimaRonda.map(m => m.ganador_id).filter(Boolean) as string[];
        if (winners.length <= 1) {
          return NextResponse.json({ error: 'Los playoffs ya tienen un ganador' }, { status: 409 });
        }
        matches = generarRondaEliminacion(winners, rondaPlayoffs + 1);
      } else {
        matches = generarRondaEliminacion(clasificados, 1);
      }
    }
  }

  if (matches.length === 0) {
    return NextResponse.json({ error: 'No se pudieron generar partidos' }, { status: 400 });
  }

  // Insert matches
  const { error } = await supabase.from('liga_partidos').insert(
    matches.map(m => ({
      liga_id:             id,
      equipo_local_id:     m.equipo_local_id,
      equipo_visitante_id: m.equipo_visitante_id,
      ronda:               m.ronda,
      fase:                m.fase,
      grupo:               m.grupo ?? null,
    })),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Transition to en_curso on first generation
  if (liga.estado === 'inscripciones') {
    await supabase.from('ligas').update({ estado: 'en_curso' }).eq('id', id);
  }

  return NextResponse.json({ ok: true, partidos: matches.length });
}
