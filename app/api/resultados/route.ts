import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST — proponer resultado
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase.from('equipo_miembros')
    .select('equipo_id').eq('jugador_id', user.id).limit(1).maybeSingle();
  const equipoId = miembro?.equipo_id;
  if (!equipoId) return NextResponse.json({ error: 'Sin equipo' }, { status: 403 });

  const { desafio_id, ganador_id, puntos_retador, puntos_retado } = await request.json();

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
    // Roll back: delete the resultado we just inserted so state stays consistent
    await supabase.from('resultados').delete().eq('id', resultado.id);
    return NextResponse.json(
      { error: `No se pudo actualizar el desafío: ${desafioUpdateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ resultado }, { status: 201 });
}

// PATCH — confirmar o disputar
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase.from('equipo_miembros')
    .select('equipo_id').eq('jugador_id', user.id).limit(1).maybeSingle();
  const equipoId = miembro?.equipo_id;
  if (!equipoId) return NextResponse.json({ error: 'Sin equipo' }, { status: 403 });

  const { id, accion } = await request.json(); // accion: 'confirmar' | 'disputar'

  // Obtener resultado
  const { data: resultado } = await supabase.from('resultados')
    .select('*').eq('id', id).maybeSingle();
  if (!resultado) return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 });

  // Solo el equipo que NO propuso puede confirmar/disputar
  if (resultado.propuesto_por === equipoId) {
    return NextResponse.json({ error: 'No puedes confirmar tu propio resultado' }, { status: 403 });
  }

  // Obtener desafio para validar participación
  const { data: desafio } = await supabase.from('desafios')
    .select('*').eq('id', resultado.desafio_id).maybeSingle();
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const esParticipante = desafio.equipo_retador_id === equipoId || desafio.equipo_retado_id === equipoId;
  if (!esParticipante) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  if (desafio.estado !== 'resultado_pendiente') return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });

  if (accion === 'confirmar') {
    // Confirmar resultado
    const { data: updatedResultado, error: updateError } = await supabase.from('resultados')
      .update({ confirmado_por_perdedor: true, confirmado_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Marcar desafio como completado
    const { error: completadoError } = await supabase
      .from('desafios')
      .update({ estado: 'completado' })
      .eq('id', resultado.desafio_id);
    if (completadoError) {
      return NextResponse.json(
        { error: `No se pudo marcar el desafío como completado: ${completadoError.message}` },
        { status: 500 }
      );
    }

    // XP de equipo: ganador +500, perdedor +150
    const perdedorId = resultado.ganador_id === desafio.equipo_retador_id
      ? desafio.equipo_retado_id
      : desafio.equipo_retador_id;

    await Promise.all([
      supabase.rpc('add_team_xp', { team_id: resultado.ganador_id, amount: 500 }),
      supabase.rpc('add_team_xp', { team_id: perdedorId,           amount: 150 }),
    ]);

    // XP personal: jugadores ganadores +100, perdedores +35
    // Las funciones add_xp también auto-nivelan al jugador
    const [{ data: miembrosGanador }, { data: miembrosPerdedor }] = await Promise.all([
      supabase.from('equipo_miembros').select('jugador_id').eq('equipo_id', resultado.ganador_id),
      supabase.from('equipo_miembros').select('jugador_id').eq('equipo_id', perdedorId),
    ]);
    await Promise.all([
      ...(miembrosGanador ?? []).map(m => supabase.rpc('add_xp', { target_user_id: m.jugador_id, amount: 100 })),
      ...(miembrosPerdedor ?? []).map(m => supabase.rpc('add_xp', { target_user_id: m.jugador_id, amount: 35  })),
    ]);

    // Actualizar dominio de cancha (victoria para el ganador, derrota para el perdedor)
    const [{ data: dominioGanador }, { data: dominioPerdedor }] = await Promise.all([
      supabase.from('cancha_dominio')
        .select('*').eq('cancha_id', desafio.cancha_id).eq('equipo_id', resultado.ganador_id).maybeSingle(),
      supabase.from('cancha_dominio')
        .select('*').eq('cancha_id', desafio.cancha_id).eq('equipo_id', perdedorId).maybeSingle(),
    ]);

    // Ganador — upsert victorias (sin tocar es_king todavía)
    if (dominioGanador) {
      await supabase.from('cancha_dominio')
        .update({ victorias: dominioGanador.victorias + 1 })
        .eq('id', dominioGanador.id);
    } else {
      await supabase.from('cancha_dominio').insert({
        cancha_id: desafio.cancha_id,
        equipo_id: resultado.ganador_id,
        victorias: 1,
        derrotas: 0,
        es_king: false,
      });
    }

    // Perdedor — upsert derrotas
    if (dominioPerdedor) {
      await supabase.from('cancha_dominio')
        .update({ derrotas: dominioPerdedor.derrotas + 1 })
        .eq('id', dominioPerdedor.id);
    } else {
      await supabase.from('cancha_dominio').insert({
        cancha_id: desafio.cancha_id,
        equipo_id: perdedorId,
        victorias: 0,
        derrotas: 1,
        es_king: false,
      });
    }

    // ── Recalcular King de esta cancha ──────────────────────────────────────
    // Regla: 1 solo King por cancha = equipo con más victorias (≥1).
    // Desempate: menos derrotas. Si empate exacto, el ganador de este partido.
    const { data: todoDominio } = await supabase
      .from('cancha_dominio')
      .select('id, equipo_id, victorias, derrotas')
      .eq('cancha_id', desafio.cancha_id)
      .gt('victorias', 0);

    if (todoDominio && todoDominio.length > 0) {
      const king = todoDominio.reduce((mejor, curr) => {
        if (curr.victorias > mejor.victorias) return curr;
        if (curr.victorias === mejor.victorias) {
          if (curr.derrotas < mejor.derrotas) return curr;
          // Último desempate: favorece al ganador del partido actual
          if (curr.derrotas === mejor.derrotas && curr.equipo_id === resultado.ganador_id) return curr;
        }
        return mejor;
      });

      await Promise.all(
        todoDominio.map(d =>
          supabase.from('cancha_dominio')
            .update({ es_king: d.id === king.id })
            .eq('id', d.id)
        )
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ resultado: updatedResultado, estado: 'completado' });
  }

  if (accion === 'disputar') {
    const { data: updatedResultado, error: updateError } = await supabase.from('resultados')
      .update({ disputado: true })
      .eq('id', id).select().single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { error: disputadoError } = await supabase
      .from('desafios')
      .update({ estado: 'disputado' })
      .eq('id', resultado.desafio_id);
    if (disputadoError) {
      return NextResponse.json(
        { error: `No se pudo marcar el desafío como disputado: ${disputadoError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ resultado: updatedResultado, estado: 'disputado' });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
