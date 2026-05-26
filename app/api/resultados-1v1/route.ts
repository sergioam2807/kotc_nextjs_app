import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// XP awards for 1v1 matches
const XP_GANADOR  = 50;
const XP_PERDEDOR = 15;
// Ranking points
const PUNTOS_VICTORIA = 3;

// ---------------------------------------------------------------------------
// POST /api/resultados-1v1
// Propose a result for a 1v1 challenge.
// Body: { desafio_id, ganador_id, puntos_retador?, puntos_retado? }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { desafio_id, ganador_id, puntos_retador, puntos_retado } = body;

  if (!desafio_id || !UUID_RE.test(desafio_id)) {
    return NextResponse.json({ error: 'desafio_id inválido' }, { status: 400 });
  }
  if (!ganador_id || !UUID_RE.test(ganador_id)) {
    return NextResponse.json({ error: 'ganador_id inválido' }, { status: 400 });
  }
  if (puntos_retador !== undefined && puntos_retador !== null) {
    if (!Number.isInteger(puntos_retador) || puntos_retador < 0 || puntos_retador > 9999) {
      return NextResponse.json({ error: 'puntos_retador inválido' }, { status: 400 });
    }
  }
  if (puntos_retado !== undefined && puntos_retado !== null) {
    if (!Number.isInteger(puntos_retado) || puntos_retado < 0 || puntos_retado > 9999) {
      return NextResponse.json({ error: 'puntos_retado inválido' }, { status: 400 });
    }
  }

  // Load the challenge
  const { data: desafio, error: fetchErr } = await supabase
    .from('desafios_individual')
    .select('id, retador_id, retado_id, estado')
    .eq('id', desafio_id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const isRetador = desafio.retador_id === user.id;
  const isRetado  = desafio.retado_id  === user.id;

  if (!isRetador && !isRetado) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  if (desafio.estado !== 'resultado_pendiente') {
    return NextResponse.json(
      { error: 'Solo se puede proponer resultado en estado resultado_pendiente' },
      { status: 409 },
    );
  }

  // Validate ganador is one of the players
  if (ganador_id !== desafio.retador_id && ganador_id !== desafio.retado_id) {
    return NextResponse.json({ error: 'ganador_id debe ser uno de los jugadores del desafío' }, { status: 400 });
  }

  // Check if a result already exists
  const { data: existing } = await supabase
    .from('resultados_individual')
    .select('id, propuesto_por, confirmado_por_perdedor')
    .eq('desafio_id', desafio_id)
    .maybeSingle();

  if (existing) {
    if (existing.confirmado_por_perdedor) {
      return NextResponse.json({ error: 'El resultado ya fue confirmado' }, { status: 409 });
    }
    // Update the proposal (allow either player to propose/update before confirmation)
    const { error: upErr } = await supabase
      .from('resultados_individual')
      .update({
        ganador_id,
        puntos_retador: puntos_retador ?? null,
        puntos_retado:  puntos_retado  ?? null,
        propuesto_por:  user.id,
        confirmado_por_perdedor: false,
        disputado: false,
        confirmado_at: null,
      })
      .eq('id', existing.id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, actualizado: true });
  }

  // Insert new result proposal
  const { error: insErr } = await supabase
    .from('resultados_individual')
    .insert({
      desafio_id,
      ganador_id,
      puntos_retador: puntos_retador ?? null,
      puntos_retado:  puntos_retado  ?? null,
      propuesto_por:  user.id,
    });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ---------------------------------------------------------------------------
// PATCH /api/resultados-1v1
// Confirm or dispute a 1v1 result.
// Body: { desafio_id, accion: 'confirmar' | 'disputar' }
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { desafio_id, accion } = body;

  if (!desafio_id || !UUID_RE.test(desafio_id)) {
    return NextResponse.json({ error: 'desafio_id inválido' }, { status: 400 });
  }
  if (!['confirmar', 'disputar'].includes(accion)) {
    return NextResponse.json({ error: 'accion inválida. Valores: confirmar, disputar' }, { status: 400 });
  }

  // Load challenge + result together
  const { data: desafio, error: fetchErr } = await supabase
    .from('desafios_individual')
    .select('id, retador_id, retado_id, estado, cancha_id')
    .eq('id', desafio_id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const isRetador = desafio.retador_id === user.id;
  const isRetado  = desafio.retado_id  === user.id;

  if (!isRetador && !isRetado) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  if (desafio.estado !== 'resultado_pendiente') {
    return NextResponse.json({ error: 'El desafío no está en estado resultado_pendiente' }, { status: 409 });
  }

  const { data: resultado, error: resErr } = await supabase
    .from('resultados_individual')
    .select('id, ganador_id, propuesto_por, confirmado_por_perdedor')
    .eq('desafio_id', desafio_id)
    .maybeSingle();

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });
  if (!resultado) return NextResponse.json({ error: 'No hay resultado propuesto aún' }, { status: 404 });

  if (resultado.confirmado_por_perdedor) {
    return NextResponse.json({ error: 'El resultado ya fue confirmado' }, { status: 409 });
  }

  // The confirmer must be the LOSER (the one who didn't propose)
  if (resultado.propuesto_por === user.id && accion === 'confirmar') {
    return NextResponse.json(
      { error: 'El proponente no puede confirmar su propio resultado — espera que el rival lo confirme' },
      { status: 400 },
    );
  }

  if (accion === 'disputar') {
    const { error: upErr } = await supabase
      .from('resultados_individual')
      .update({ disputado: true })
      .eq('id', resultado.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, disputado: true });
  }

  // ── confirmar: idempotency guard ────────────────────────────────────────────
  // Use `.eq('confirmado_por_perdedor', false)` to prevent double-XP
  const { data: confirmed, error: confirmErr } = await supabase
    .from('resultados_individual')
    .update({ confirmado_por_perdedor: true, confirmado_at: new Date().toISOString() })
    .eq('id', resultado.id)
    .eq('confirmado_por_perdedor', false) // idempotency guard
    .select('id')
    .maybeSingle();

  if (confirmErr) return NextResponse.json({ error: confirmErr.message }, { status: 500 });
  if (!confirmed) {
    // Already confirmed (race condition)
    return NextResponse.json({ ok: true, yaConfirmado: true });
  }

  // Mark desafio as completado
  await supabase
    .from('desafios_individual')
    .update({ estado: 'completado' })
    .eq('id', desafio_id);

  const ganadorId  = resultado.ganador_id;
  const perdedorId = ganadorId === desafio.retador_id ? desafio.retado_id : desafio.retador_id;

  // ── Award XP ────────────────────────────────────────────────────────────────
  await Promise.all([
    supabase.rpc('add_xp', { target_user_id: ganadorId,  amount: XP_GANADOR }),
    supabase.rpc('add_xp', { target_user_id: perdedorId, amount: XP_PERDEDOR }),
  ]);

  // ── Update ranking_1v1 ──────────────────────────────────────────────────────
  // Fetch temporada activa (if any) for 1v1
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id')
    .eq('activa', true)
    .maybeSingle();

  const temporadaId = temporada?.id ?? null;

  // Fetch both rows in parallel to minimise round-trips
  const [{ data: winnerRow }, { data: loserRow }] = await Promise.all([
    supabase
      .from('ranking_1v1')
      .select('id, victorias, racha_actual, racha_max, puntos')
      .eq('jugador_id', ganadorId)
      .is('temporada_id', temporadaId)
      .maybeSingle(),
    supabase
      .from('ranking_1v1')
      .select('id, derrotas, victorias, puntos, racha_actual, racha_max')
      .eq('jugador_id', perdedorId)
      .is('temporada_id', temporadaId)
      .maybeSingle(),
  ]);

  // ── Winner ──────────────────────────────────────────────────────────────────
  if (winnerRow) {
    const newRacha    = (winnerRow.racha_actual ?? 0) + 1;
    const newRachaMax = Math.max(winnerRow.racha_max ?? 0, newRacha);
    const { error: wErr } = await supabase
      .from('ranking_1v1')
      .update({
        victorias:    (winnerRow.victorias ?? 0) + 1,
        puntos:       (winnerRow.puntos ?? 0) + PUNTOS_VICTORIA,
        racha_actual: newRacha,
        racha_max:    newRachaMax,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', winnerRow.id);
    if (wErr) console.error('[ranking_1v1] winner update error:', wErr.message);
  } else {
    const { error: wErr } = await supabase.from('ranking_1v1').insert({
      jugador_id:   ganadorId,
      temporada_id: temporadaId,
      victorias:    1,
      puntos:       PUNTOS_VICTORIA,
      racha_actual: 1,
      racha_max:    1,
      derrotas:     0,
    });
    if (wErr) console.error('[ranking_1v1] winner insert error:', wErr.message);
  }

  // ── Loser ───────────────────────────────────────────────────────────────────
  if (loserRow) {
    const { error: lErr } = await supabase
      .from('ranking_1v1')
      .update({
        derrotas:     (loserRow.derrotas ?? 0) + 1,
        racha_actual: 0,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', loserRow.id);
    if (lErr) console.error('[ranking_1v1] loser update error:', lErr.message);
  } else {
    const { error: lErr } = await supabase.from('ranking_1v1').insert({
      jugador_id:   perdedorId,
      temporada_id: temporadaId,
      derrotas:     1,
      racha_actual: 0,
      victorias:    0,
      puntos:       0,
      racha_max:    0,
    });
    if (lErr) console.error('[ranking_1v1] loser insert error:', lErr.message);
  }

  // ── 1v1 Court dominio tracking ─────────────────────────────────────────────
  // If the challenge was on a court, track the individual player dominio there.
  const canchaId = desafio.cancha_id as string | null;
  if (canchaId) {
    try {
      // Helper: upsert a cancha_dominio row for a player (1v1 format)
      const upsertPlayerDominio = async (jugadorId: string, isWin: boolean) => {
        let q = supabase
          .from('cancha_dominio')
          .select('id, victorias, derrotas')
          .eq('cancha_id', canchaId)
          .eq('jugador_id', jugadorId)
          .eq('formato', '1v1');
        if (temporadaId) q = q.eq('temporada_id', temporadaId);
        else             q = q.is('temporada_id', null);
        const { data: existing } = await q.maybeSingle();

        if (existing) {
          await supabase
            .from('cancha_dominio')
            .update(isWin ? { victorias: existing.victorias + 1 } : { derrotas: existing.derrotas + 1 })
            .eq('id', existing.id);
        } else {
          await supabase.from('cancha_dominio').insert({
            cancha_id:    canchaId,
            equipo_id:    null,
            jugador_id:   jugadorId,
            formato:      '1v1',
            temporada_id: temporadaId,
            victorias:    isWin ? 1 : 0,
            derrotas:     isWin ? 0 : 1,
            es_king:      false,
          });
        }
      };

      await Promise.all([
        upsertPlayerDominio(ganadorId,  true),
        upsertPlayerDominio(perdedorId, false),
      ]);

      // Recalculate 1v1 King for this court
      let kingQuery = supabase
        .from('cancha_dominio')
        .select('id, jugador_id, victorias, derrotas')
        .eq('cancha_id', canchaId)
        .eq('formato', '1v1')
        .gt('victorias', 0)
        .not('jugador_id', 'is', null);
      if (temporadaId) kingQuery = kingQuery.eq('temporada_id', temporadaId);
      else             kingQuery = kingQuery.is('temporada_id', null);

      const { data: playerDominio } = await kingQuery;
      if (playerDominio && playerDominio.length > 0) {
        const king = (playerDominio as { id: string; jugador_id: string; victorias: number; derrotas: number }[])
          .reduce((best, curr) => {
            if (curr.victorias > best.victorias) return curr;
            if (curr.victorias === best.victorias) {
              if (curr.derrotas < best.derrotas) return curr;
              if (curr.derrotas === best.derrotas && curr.jugador_id === ganadorId) return curr;
            }
            return best;
          });

        await Promise.all(
          playerDominio.map(d =>
            supabase.from('cancha_dominio').update({ es_king: d.id === king.id }).eq('id', d.id)
          )
        );
      }
    } catch (err) {
      console.error('[cancha_dominio 1v1] error:', err);
      // Non-fatal — don't fail the whole confirmation for this
    }
  }

  return NextResponse.json({ ok: true, confirmado: true });
}
