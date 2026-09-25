import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchPartidoRapido,
  validarSquad,
  jugadoresExisten,
  filasJugadoresLado,
} from '@/lib/partidos-rapidos';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// GET /api/partidos-rapidos/[id]
// Estado actual del partido — usado por el polling de las pantallas
// "Buscando rival…" y "Esperando respuesta" para detectar el cambio de estado.
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const partido = await fetchPartidoRapido(supabase, id);
  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

  if (partido.capitan_a_id !== user.id && partido.capitan_b_id !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  return NextResponse.json({ partido });
}

// ---------------------------------------------------------------------------
// PATCH /api/partidos-rapidos/[id]
// Body: { accion: 'cancelar' | 'aceptar' | 'rechazar', squad? }
//   cancelar → solo capitán a, desde 'buscando' o 'pendiente'.
//   aceptar  → solo capitán b (el retado), desde 'pendiente'; `squad` opcional
//              (mismo formato que el POST) para sumar compañeros al aceptar.
//   rechazar → solo capitán b, desde 'pendiente'.
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
  if (!['cancelar', 'aceptar', 'rechazar'].includes(accion)) {
    return NextResponse.json({ error: 'accion inválida. Valores: cancelar, aceptar, rechazar' }, { status: 400 });
  }

  const { data: partido } = await supabase
    .from('partidos_rapidos')
    .select('id, capitan_a_id, capitan_b_id, estado')
    .eq('id', id)
    .maybeSingle();
  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

  if (accion === 'cancelar') {
    if (partido.capitan_a_id !== user.id) {
      return NextResponse.json({ error: 'Solo el capitán puede cancelar' }, { status: 403 });
    }
    if (!['buscando', 'pendiente'].includes(partido.estado)) {
      return NextResponse.json({ error: 'Solo se puede cancelar mientras está buscando o pendiente' }, { status: 409 });
    }
    const { error } = await supabase
      .from('partidos_rapidos')
      .update({ estado: 'cancelado' })
      .eq('id', id)
      .eq('estado', partido.estado);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, estado: 'cancelado' });
  }

  // aceptar / rechazar: solo el retado, solo desde 'pendiente'
  if (partido.capitan_b_id !== user.id) {
    return NextResponse.json({ error: 'Solo el jugador retado puede responder' }, { status: 403 });
  }
  if (partido.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Ese reto ya no está pendiente' }, { status: 409 });
  }

  if (accion === 'rechazar') {
    const { error } = await supabase
      .from('partidos_rapidos')
      .update({ estado: 'rechazado' })
      .eq('id', id)
      .eq('estado', 'pendiente');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, estado: 'rechazado' });
  }

  // aceptar
  const squadValidado = validarSquad(body.squad, user.id);
  if ('error' in squadValidado) {
    return NextResponse.json({ error: squadValidado.error }, { status: squadValidado.status });
  }
  const { companeros } = squadValidado;
  if (!(await jugadoresExisten(supabase, companeros))) {
    return NextResponse.json({ error: 'Uno o más jugadores invitados no existen' }, { status: 404 });
  }

  const { data: aceptado, error: acceptError } = await supabase
    .from('partidos_rapidos')
    .update({ estado: 'emparejado', matched_at: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'pendiente')
    .select('id')
    .maybeSingle();
  if (acceptError) return NextResponse.json({ error: acceptError.message }, { status: 500 });
  if (!aceptado) return NextResponse.json({ error: 'Ese reto ya no está pendiente' }, { status: 409 });

  const { error: jugadoresError } = await supabase
    .from('partido_rapido_jugadores')
    .insert(filasJugadoresLado(id, 'b', user.id, companeros));
  if (jugadoresError) return NextResponse.json({ error: jugadoresError.message }, { status: 500 });

  const partidoActualizado = await fetchPartidoRapido(supabase, id);
  return NextResponse.json({ ok: true, estado: 'emparejado', partido: partidoActualizado });
}
