import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mismos montos por-jugador que ya se usan para desafíos de equipo — un 3v3
// real es más parejo a un partido de equipo que a un 1v1 (ver CLAUDE.md).
// Los invitados sin cuenta (nombre_invitado, sin jugador_id) no reciben XP.
const XP_GANADOR = 100;
const XP_PERDEDOR = 35;

/** Upsert de cancha_dominio para el capitán ganador/perdedor (formato '3v3'). */
async function upsertDominioCapitan(
  supabase: SupabaseClient,
  opts: { cancha_id: string; jugador_id: string; temporada_id: string | null; isWin: boolean },
) {
  const { cancha_id, jugador_id, temporada_id, isWin } = opts;
  let query = supabase
    .from('cancha_dominio')
    .select('id, victorias, derrotas')
    .eq('cancha_id', cancha_id)
    .eq('jugador_id', jugador_id)
    .eq('formato', '3v3');
  query = temporada_id ? query.eq('temporada_id', temporada_id) : query.is('temporada_id', null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    await supabase
      .from('cancha_dominio')
      .update(isWin ? { victorias: existing.victorias + 1 } : { derrotas: existing.derrotas + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('cancha_dominio').insert({
      cancha_id,
      equipo_id: null,
      jugador_id,
      formato: '3v3',
      temporada_id,
      victorias: isWin ? 1 : 0,
      derrotas: isWin ? 0 : 1,
      es_king: false,
    });
  }
}

/** Recalcula el Rey 3v3 de la cancha (atribuido al capitán ganador de esa fila). */
async function recalcularKingCapitan(
  supabase: SupabaseClient,
  cancha_id: string,
  temporada_id: string | null,
  ganadorCapitanId: string,
): Promise<string | null> {
  let query = supabase
    .from('cancha_dominio')
    .select('id, jugador_id, victorias, derrotas')
    .eq('cancha_id', cancha_id)
    .eq('formato', '3v3')
    .gt('victorias', 0)
    .not('jugador_id', 'is', null);
  query = temporada_id ? query.eq('temporada_id', temporada_id) : query.is('temporada_id', null);

  const { data: dominio } = await query;
  if (!dominio || dominio.length === 0) return null;

  const king = (dominio as { id: string; jugador_id: string; victorias: number; derrotas: number }[])
    .reduce((best, curr) => {
      if (curr.victorias > best.victorias) return curr;
      if (curr.victorias === best.victorias) {
        if (curr.derrotas < best.derrotas) return curr;
        if (curr.derrotas === best.derrotas && curr.jugador_id === ganadorCapitanId) return curr;
      }
      return best;
    });

  await Promise.all(
    dominio.map(d => supabase.from('cancha_dominio').update({ es_king: d.id === king.id }).eq('id', d.id)),
  );

  return king.jugador_id;
}

// ---------------------------------------------------------------------------
// POST /api/partidos-rapidos/[id]/resultado
// Propone un resultado (cualquiera de los dos capitanes, estado 'emparejado').
// Body: { ganador_lado: 'a' | 'b', puntos_a?, puntos_b? }
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { ganador_lado, puntos_a, puntos_b } = body;

  if (!['a', 'b'].includes(ganador_lado)) {
    return NextResponse.json({ error: 'ganador_lado inválido. Valores: a, b' }, { status: 400 });
  }
  for (const pts of [puntos_a, puntos_b]) {
    if (pts !== undefined && pts !== null && (!Number.isInteger(pts) || pts < 0 || pts > 9999)) {
      return NextResponse.json({ error: 'Puntos inválidos' }, { status: 400 });
    }
  }

  const { data: partido, error: fetchErr } = await supabase
    .from('partidos_rapidos')
    .select('id, capitan_a_id, capitan_b_id, estado')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

  const esCapitanA = partido.capitan_a_id === user.id;
  const esCapitanB = partido.capitan_b_id === user.id;
  if (!esCapitanA && !esCapitanB) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  // 'resultado_pendiente' además de 'emparejado' porque un resultado
  // disputado (resultado.disputado=true) NO mueve el estado del partido —
  // se puede volver a proponer sin salir de resultado_pendiente, igual que
  // en resultados-1v1.
  if (!['emparejado', 'resultado_pendiente'].includes(partido.estado)) {
    return NextResponse.json({ error: 'Solo se puede proponer resultado con el partido emparejado' }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from('resultados_partido_rapido')
    .select('id, confirmado_por_perdedor')
    .eq('partido_id', id)
    .maybeSingle();

  if (existing) {
    if (existing.confirmado_por_perdedor) {
      return NextResponse.json({ error: 'El resultado ya fue confirmado' }, { status: 409 });
    }
    const { error: upErr } = await supabase
      .from('resultados_partido_rapido')
      .update({
        ganador_lado,
        puntos_a: puntos_a ?? null,
        puntos_b: puntos_b ?? null,
        propuesto_por: user.id,
        confirmado_por_perdedor: false,
        disputado: false,
        confirmado_at: null,
      })
      .eq('id', existing.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, actualizado: true });
  }

  const { error: insErr } = await supabase.from('resultados_partido_rapido').insert({
    partido_id: id,
    ganador_lado,
    puntos_a: puntos_a ?? null,
    puntos_b: puntos_b ?? null,
    propuesto_por: user.id,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabase.from('partidos_rapidos').update({ estado: 'resultado_pendiente' }).eq('id', id);

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/partidos-rapidos/[id]/resultado
// Body: { accion: 'confirmar' | 'disputar' } — confirma el capitán contrario
// al que propuso (no puede confirmar su propia propuesta).
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { accion } = body;
  if (!['confirmar', 'disputar'].includes(accion)) {
    return NextResponse.json({ error: 'accion inválida. Valores: confirmar, disputar' }, { status: 400 });
  }

  const { data: partido, error: fetchErr } = await supabase
    .from('partidos_rapidos')
    .select('id, cancha_id, formato, temporada_id, capitan_a_id, capitan_b_id, estado, canchas(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canchaRaw = (partido as any).canchas;
  const canchaNombre: string | null = (Array.isArray(canchaRaw) ? canchaRaw[0]?.nombre : canchaRaw?.nombre) ?? null;

  const esCapitanA = partido.capitan_a_id === user.id;
  const esCapitanB = partido.capitan_b_id === user.id;
  if (!esCapitanA && !esCapitanB) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  if (partido.estado !== 'resultado_pendiente') {
    return NextResponse.json({ error: 'El partido no está en estado resultado_pendiente' }, { status: 409 });
  }

  const { data: resultado, error: resErr } = await supabase
    .from('resultados_partido_rapido')
    .select('id, ganador_lado, propuesto_por, confirmado_por_perdedor')
    .eq('partido_id', id)
    .maybeSingle();
  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });
  if (!resultado) return NextResponse.json({ error: 'No hay resultado propuesto aún' }, { status: 404 });
  if (resultado.confirmado_por_perdedor) {
    return NextResponse.json({ error: 'El resultado ya fue confirmado' }, { status: 409 });
  }
  if (resultado.propuesto_por === user.id && accion === 'confirmar') {
    return NextResponse.json(
      { error: 'El proponente no puede confirmar su propio resultado — espera que el rival lo confirme' },
      { status: 400 },
    );
  }

  if (accion === 'disputar') {
    // No se toca partidos_rapidos.estado (queda en 'resultado_pendiente') —
    // a diferencia del flujo de equipo, acá no hay re_proponer/aceptar_original
    // como sub-FSM separada: disputar solo flaguea el resultado, y cualquiera
    // de los dos capitanes puede volver a proponer (POST de este mismo
    // archivo, rama "existing") sin salir de resultado_pendiente.
    const { error: upErr } = await supabase
      .from('resultados_partido_rapido')
      .update({ disputado: true })
      .eq('id', resultado.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, disputado: true });
  }

  // ── confirmar: idempotency guard ────────────────────────────────────────────
  const { data: confirmed, error: confirmErr } = await supabase
    .from('resultados_partido_rapido')
    .update({ confirmado_por_perdedor: true, confirmado_at: new Date().toISOString() })
    .eq('id', resultado.id)
    .eq('confirmado_por_perdedor', false)
    .select('id')
    .maybeSingle();
  if (confirmErr) return NextResponse.json({ error: confirmErr.message }, { status: 500 });
  if (!confirmed) return NextResponse.json({ ok: true, yaConfirmado: true });

  await supabase.from('partidos_rapidos').update({ estado: 'completado' }).eq('id', id);

  const capitanGanadorId = resultado.ganador_lado === 'a' ? partido.capitan_a_id : partido.capitan_b_id;
  const capitanPerdedorId = resultado.ganador_lado === 'a' ? partido.capitan_b_id : partido.capitan_a_id;
  const ladoGanador = resultado.ganador_lado as 'a' | 'b';

  // ── XP: a todos los jugadores registrados de ambos lados (no a invitados) ──
  const { data: jugadores } = await supabase
    .from('partido_rapido_jugadores')
    .select('lado, jugador_id')
    .eq('partido_id', id)
    .not('jugador_id', 'is', null);

  await Promise.all(
    (jugadores ?? []).map(j =>
      supabase.rpc('add_xp', {
        target_user_id: j.jugador_id,
        amount: j.lado === ladoGanador ? XP_GANADOR : XP_PERDEDOR,
      }),
    ),
  );

  // ── Dominio de cancha (Rey 3v3, atribuido al capitán) ───────────────────────
  let kingJugadorId: string | null = null;
  if (capitanGanadorId && capitanPerdedorId) {
    try {
      await Promise.all([
        upsertDominioCapitan(supabase, { cancha_id: partido.cancha_id, jugador_id: capitanGanadorId, temporada_id: partido.temporada_id, isWin: true }),
        upsertDominioCapitan(supabase, { cancha_id: partido.cancha_id, jugador_id: capitanPerdedorId, temporada_id: partido.temporada_id, isWin: false }),
      ]);
      kingJugadorId = await recalcularKingCapitan(supabase, partido.cancha_id, partido.temporada_id, capitanGanadorId);
    } catch (err) {
      console.error('[cancha_dominio 3v3] error:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    confirmado: true,
    ganador_lado: ladoGanador,
    capitan_ganador_id: capitanGanadorId,
    king_jugador_id: kingJugadorId,
    cancha_nombre: canchaNombre,
    xp: { ganador: XP_GANADOR, perdedor: XP_PERDEDOR },
  });
}
