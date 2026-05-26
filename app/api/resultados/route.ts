import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers — dominio upsert + king recalculation
// ---------------------------------------------------------------------------

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Upsert a cancha_dominio row for a given (court, entity, format) scope. */
async function upsertDominioEquipo(
  supabase: SupabaseClient,
  opts: {
    cancha_id: string;
    equipo_id: string;
    formato: string;
    temporada_id: string | null;
    isWin: boolean;
  }
) {
  const { cancha_id, equipo_id, formato, temporada_id, isWin } = opts;

  let query = supabase
    .from('cancha_dominio')
    .select('id, victorias, derrotas')
    .eq('cancha_id', cancha_id)
    .eq('equipo_id', equipo_id)
    .eq('formato', formato);
  if (temporada_id) query = query.eq('temporada_id', temporada_id);
  else              query = query.is('temporada_id', null);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    await supabase
      .from('cancha_dominio')
      .update(isWin ? { victorias: existing.victorias + 1 } : { derrotas: existing.derrotas + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('cancha_dominio').insert({
      cancha_id,
      equipo_id,
      jugador_id: null,
      formato,
      temporada_id,
      victorias: isWin ? 1 : 0,
      derrotas:  isWin ? 0 : 1,
      es_king:   false,
    });
  }
}

/** Recalculate the single King for a given (court, format, temporada) scope. */
async function recalcularKingEquipo(
  supabase: SupabaseClient,
  cancha_id: string,
  formato: string,
  temporada_id: string | null,
  ganadorEquipoId: string
) {
  let query = supabase
    .from('cancha_dominio')
    .select('id, equipo_id, victorias, derrotas')
    .eq('cancha_id', cancha_id)
    .eq('formato', formato)
    .gt('victorias', 0);
  if (temporada_id) query = query.eq('temporada_id', temporada_id);
  else              query = query.is('temporada_id', null);

  // Only team rows
  query = query.not('equipo_id', 'is', null);

  const { data: dominio } = await query;
  if (!dominio || dominio.length === 0) return;

  const king = (dominio as { id: string; equipo_id: string; victorias: number; derrotas: number }[])
    .reduce((best, curr) => {
      if (curr.victorias > best.victorias) return curr;
      if (curr.victorias === best.victorias) {
        if (curr.derrotas < best.derrotas) return curr;
        if (curr.derrotas === best.derrotas && curr.equipo_id === ganadorEquipoId) return curr;
      }
      return best;
    });

  await Promise.all(
    dominio.map(d =>
      supabase.from('cancha_dominio').update({ es_king: d.id === king.id }).eq('id', d.id)
    )
  );
}

// ---------------------------------------------------------------------------
// POST /api/resultados — proponer resultado
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase.from('equipo_miembros')
    .select('equipo_id').eq('jugador_id', user.id).limit(1).maybeSingle();
  const equipoId = miembro?.equipo_id;
  if (!equipoId) return NextResponse.json({ error: 'Sin equipo' }, { status: 403 });

  const { desafio_id, ganador_id, puntos_retador, puntos_retado } = await request.json();

  // Input validation
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!desafio_id || !UUID_RE.test(desafio_id)) {
    return NextResponse.json({ error: 'desafio_id inválido' }, { status: 400 });
  }
  if (!ganador_id || !UUID_RE.test(ganador_id)) {
    return NextResponse.json({ error: 'ganador_id inválido' }, { status: 400 });
  }
  if (puntos_retador !== null && puntos_retador !== undefined) {
    if (typeof puntos_retador !== 'number' || !Number.isInteger(puntos_retador) || puntos_retador < 0 || puntos_retador > 9999) {
      return NextResponse.json({ error: 'puntos_retador inválido' }, { status: 400 });
    }
  }
  if (puntos_retado !== null && puntos_retado !== undefined) {
    if (typeof puntos_retado !== 'number' || !Number.isInteger(puntos_retado) || puntos_retado < 0 || puntos_retado > 9999) {
      return NextResponse.json({ error: 'puntos_retado inválido' }, { status: 400 });
    }
  }

  // Validar desafio
  const { data: desafio } = await supabase.from('desafios')
    .select('*').eq('id', desafio_id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const esParticipante = desafio.equipo_retador_id === equipoId || desafio.equipo_retado_id === equipoId;
  if (!esParticipante) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  if (desafio.estado !== 'aceptado') return NextResponse.json({ error: 'El desafío debe estar aceptado' }, { status: 400 });

  const ganadorValido = ganador_id === desafio.equipo_retador_id || ganador_id === desafio.equipo_retado_id;
  if (!ganadorValido) return NextResponse.json({ error: 'Ganador inválido' }, { status: 400 });

  // Crear resultado
  const { data: resultado, error: insertError } = await supabase.from('resultados')
    .insert({
      desafio_id,
      ganador_id,
      propuesto_por: equipoId,
      puntos_retador: puntos_retador ?? null,
      puntos_retado:  puntos_retado  ?? null,
    })
    .select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Actualizar estado del desafio
  const { error: desafioUpdateError } = await supabase
    .from('desafios')
    .update({ estado: 'resultado_pendiente' })
    .eq('id', desafio_id);
  if (desafioUpdateError) {
    await supabase.from('resultados').delete().eq('id', resultado.id);
    return NextResponse.json(
      { error: `No se pudo actualizar el desafío: ${desafioUpdateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ resultado }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/resultados — confirmar o disputar
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase.from('equipo_miembros')
    .select('equipo_id').eq('jugador_id', user.id).limit(1).maybeSingle();
  const equipoId = miembro?.equipo_id;
  if (!equipoId) return NextResponse.json({ error: 'Sin equipo' }, { status: 403 });

  const { id, accion } = await request.json(); // accion: 'confirmar' | 'disputar'

  if (!['confirmar', 'disputar'].includes(accion)) {
    return NextResponse.json({ error: 'accion inválida' }, { status: 400 });
  }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id de resultado requerido' }, { status: 400 });
  }

  // Obtener resultado
  const { data: resultado } = await supabase.from('resultados')
    .select('*').eq('id', id).maybeSingle();
  if (!resultado) return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 });

  if (resultado.propuesto_por === equipoId) {
    return NextResponse.json({ error: 'No puedes confirmar tu propio resultado' }, { status: 403 });
  }

  // Obtener desafio
  const { data: desafio } = await supabase.from('desafios')
    .select('*').eq('id', resultado.desafio_id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const esParticipante = desafio.equipo_retador_id === equipoId || desafio.equipo_retado_id === equipoId;
  if (!esParticipante) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  if (desafio.estado !== 'resultado_pendiente') return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  // ── DISPUTAR ─────────────────────────────────────────────────────────────
  if (accion === 'disputar') {
    const { data: updatedResultado, error: updateError } = await supabase.from('resultados')
      .update({ disputado: true })
      .eq('id', id).select().single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { error: disputadoError } = await supabase
      .from('desafios').update({ estado: 'disputado' }).eq('id', resultado.desafio_id);
    if (disputadoError) {
      return NextResponse.json(
        { error: `No se pudo marcar el desafío como disputado: ${disputadoError.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ resultado: updatedResultado, estado: 'disputado' });
  }

  // ── CONFIRMAR ─────────────────────────────────────────────────────────────
  // Atomic update — idempotency guard prevents double-XP on race conditions
  const { data: updatedResultado, error: updateError } = await supabase.from('resultados')
    .update({ confirmado_por_perdedor: true, confirmado_at: new Date().toISOString() })
    .eq('id', id)
    .eq('confirmado_por_perdedor', false)
    .select().single();
  if (updateError || !updatedResultado) {
    return NextResponse.json(
      { error: 'El resultado ya fue confirmado o no se pudo actualizar' },
      { status: 409 }
    );
  }

  // Marcar desafio como completado
  const { error: completadoError } = await supabase
    .from('desafios').update({ estado: 'completado' }).eq('id', resultado.desafio_id);
  if (completadoError) {
    return NextResponse.json(
      { error: `No se pudo marcar el desafío como completado: ${completadoError.message}` },
      { status: 500 }
    );
  }

  const ganadorId  = resultado.ganador_id as string;
  const perdedorId = ganadorId === desafio.equipo_retador_id
    ? desafio.equipo_retado_id
    : desafio.equipo_retador_id;

  // ── XP de equipo ──────────────────────────────────────────────────────────
  await Promise.all([
    supabase.rpc('add_team_xp', { team_id: ganadorId,  amount: 500 }),
    supabase.rpc('add_team_xp', { team_id: perdedorId, amount: 150 }),
  ]);

  // ── XP personal ───────────────────────────────────────────────────────────
  const [{ data: miembrosGanador }, { data: miembrosPerdedor }] = await Promise.all([
    supabase.from('equipo_miembros').select('jugador_id').eq('equipo_id', ganadorId),
    supabase.from('equipo_miembros').select('jugador_id').eq('equipo_id', perdedorId),
  ]);
  await Promise.all([
    ...(miembrosGanador ?? []).map(m => supabase.rpc('add_xp', { target_user_id: m.jugador_id, amount: 100 })),
    ...(miembrosPerdedor ?? []).map(m => supabase.rpc('add_xp', { target_user_id: m.jugador_id, amount: 35  })),
  ]);

  // ── Dominio de cancha por formato ─────────────────────────────────────────
  // Track both the specific format (e.g. '3v3') AND 'general' (cross-format aggregate).
  // desafio.formato is the format of this specific challenge.
  const formato = desafio.formato as string; // e.g. '3v3', '5v5', 'equipo_completo'

  // Temporada activa (for scoping, may be null)
  const { data: temporada } = await supabase
    .from('temporadas').select('id').eq('activa', true).maybeSingle();
  const temporadaId = temporada?.id ?? null;

  if (desafio.cancha_id) {
    const canchaId = desafio.cancha_id as string;

    // Upsert format-specific rows (only if formato !== 'general', which it won't be for team desafios)
    if (formato && formato !== 'general') {
      await Promise.all([
        upsertDominioEquipo(supabase, { cancha_id: canchaId, equipo_id: ganadorId,  formato, temporada_id: temporadaId, isWin: true  }),
        upsertDominioEquipo(supabase, { cancha_id: canchaId, equipo_id: perdedorId, formato, temporada_id: temporadaId, isWin: false }),
      ]);
    }

    // Always upsert 'general' rows (aggregate across all formats)
    await Promise.all([
      upsertDominioEquipo(supabase, { cancha_id: canchaId, equipo_id: ganadorId,  formato: 'general', temporada_id: temporadaId, isWin: true  }),
      upsertDominioEquipo(supabase, { cancha_id: canchaId, equipo_id: perdedorId, formato: 'general', temporada_id: temporadaId, isWin: false }),
    ]);

    // Recalculate King for both scopes
    const recalcPromises: Promise<void>[] = [
      recalcularKingEquipo(supabase, canchaId, 'general', temporadaId, ganadorId),
    ];
    if (formato && formato !== 'general') {
      recalcPromises.push(
        recalcularKingEquipo(supabase, canchaId, formato, temporadaId, ganadorId)
      );
    }
    await Promise.all(recalcPromises);
  }

  return NextResponse.json({ resultado: updatedResultado, estado: 'completado' });
}
