import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchPartidoRapido,
  validarSquad,
  jugadoresExisten,
  filasJugadoresLado,
  type MiembroSquad,
} from '@/lib/partidos-rapidos';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTADOS_ACTIVOS = ['pendiente', 'buscando', 'emparejado', 'resultado_pendiente', 'disputado'];

// ---------------------------------------------------------------------------
// GET /api/partidos-rapidos
//   sin params            → partidos del usuario (capitán a o b), para /desafios
//   ?cancha_id=&mode=lobby → tríos "buscando" en esa cancha (ajenos), para que
//                             el wizard ofrezca "unirme a este trío" (opción 3
//                             del paso "Elegir rival")
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const canchaId = searchParams.get('cancha_id');
  const mode = searchParams.get('mode');

  if (mode === 'lobby') {
    if (!canchaId || !UUID_RE.test(canchaId)) {
      return NextResponse.json({ error: 'cancha_id inválido' }, { status: 400 });
    }
    const { data: rows, error } = await supabase
      .from('partidos_rapidos')
      .select('id')
      .eq('cancha_id', canchaId)
      .eq('formato', '3v3')
      .eq('estado', 'buscando')
      .neq('capitan_a_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const lobby = await Promise.all((rows ?? []).map(r => fetchPartidoRapido(supabase, r.id)));
    return NextResponse.json({ lobby: lobby.filter(Boolean) });
  }

  const { data: rows, error } = await supabase
    .from('partidos_rapidos')
    .select('id')
    .or(`capitan_a_id.eq.${user.id},capitan_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const partidos = await Promise.all((rows ?? []).map(r => fetchPartidoRapido(supabase, r.id)));

  return NextResponse.json({ partidos: partidos.filter(Boolean), userId: user.id });
}

// ---------------------------------------------------------------------------
// POST /api/partidos-rapidos
// Arma un trío 3v3 y elige cómo buscar rival. Body:
//   { cancha_id, squad, rival_jugador_id? }  → reto directo (a un jugador o
//     al Rey — el cliente resuelve quién es, el server solo valida que
//     exista). Crea el partido en 'pendiente'; el rival debe aceptar.
//   { cancha_id, squad, join_partido_id? }   → unirse a un trío que ya está
//     "buscando" en esa cancha (mutuo opt-in, sin paso de aceptar).
//   { cancha_id, squad }                     → "buscar automáticamente":
//     intenta emparejar contra otro "buscando" en la misma cancha; si no,
//     queda "buscando" (lobby abierto).
// `rival_jugador_id` y `join_partido_id` son mutuamente excluyentes.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { cancha_id, squad, rival_jugador_id, join_partido_id } = body as {
    cancha_id?: string;
    squad?: MiembroSquad[];
    rival_jugador_id?: string;
    join_partido_id?: string;
  };

  // ── Validaciones comunes ─────────────────────────────────────────────────
  if (!cancha_id || !UUID_RE.test(cancha_id)) {
    return NextResponse.json({ error: 'cancha_id inválido' }, { status: 400 });
  }
  if (rival_jugador_id && join_partido_id) {
    return NextResponse.json({ error: 'rival_jugador_id y join_partido_id son mutuamente excluyentes' }, { status: 400 });
  }
  if (rival_jugador_id && !UUID_RE.test(rival_jugador_id)) {
    return NextResponse.json({ error: 'rival_jugador_id inválido' }, { status: 400 });
  }
  if (rival_jugador_id === user.id) {
    return NextResponse.json({ error: 'No puedes retarte a ti mismo' }, { status: 400 });
  }
  if (join_partido_id && !UUID_RE.test(join_partido_id)) {
    return NextResponse.json({ error: 'join_partido_id inválido' }, { status: 400 });
  }

  const squadValidado = validarSquad(squad, user.id);
  if ('error' in squadValidado) {
    return NextResponse.json({ error: squadValidado.error }, { status: squadValidado.status });
  }
  const { companeros } = squadValidado;

  // Cancha debe existir y estar verificada
  const { data: cancha } = await supabase
    .from('canchas')
    .select('id, status')
    .eq('id', cancha_id)
    .maybeSingle();
  if (!cancha) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
  if (cancha.status !== 'verified') {
    return NextResponse.json({ error: 'Solo se puede jugar en canchas verificadas' }, { status: 400 });
  }

  if (!(await jugadoresExisten(supabase, companeros))) {
    return NextResponse.json({ error: 'Uno o más jugadores invitados no existen' }, { status: 404 });
  }

  // No permitir más de un partido rápido activo a la vez
  const { data: activo } = await supabase
    .from('partidos_rapidos')
    .select('id')
    .or(`capitan_a_id.eq.${user.id},capitan_b_id.eq.${user.id}`)
    .in('estado', ESTADOS_ACTIVOS)
    .limit(1)
    .maybeSingle();
  if (activo) {
    return NextResponse.json({ error: 'Ya tienes un partido rápido activo', partido_id: activo.id }, { status: 409 });
  }

  // Temporada activa (scoping opcional, igual que el resto del King system)
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id')
    .eq('activa', true)
    .maybeSingle();
  const temporadaId = temporada?.id ?? null;

  if (join_partido_id) {
    return unirseATrio(supabase, user.id, cancha_id, join_partido_id, companeros);
  }
  if (rival_jugador_id) {
    return retarDirecto(supabase, user.id, cancha_id, rival_jugador_id, temporadaId, companeros);
  }
  return buscarAutomaticamente(supabase, user.id, cancha_id, temporadaId, companeros);
}

// ── Camino 1: unirse a un trío que ya está "buscando" en esa cancha ────────
async function unirseATrio(
  supabase: SupabaseClient,
  userId: string,
  canchaId: string,
  joinPartidoId: string,
  companeros: MiembroSquad[],
) {
  const { data: objetivo } = await supabase
    .from('partidos_rapidos')
    .select('id, cancha_id, capitan_a_id, estado')
    .eq('id', joinPartidoId)
    .maybeSingle();
  if (!objetivo) return NextResponse.json({ error: 'Ese trío ya no existe' }, { status: 404 });
  if (objetivo.cancha_id !== canchaId) {
    return NextResponse.json({ error: 'Ese trío está buscando en otra cancha' }, { status: 400 });
  }
  if (objetivo.capitan_a_id === userId) {
    return NextResponse.json({ error: 'No puedes unirte a tu propio trío' }, { status: 400 });
  }

  const { data: unido, error: joinError } = await supabase
    .from('partidos_rapidos')
    .update({ capitan_b_id: userId, estado: 'emparejado', matched_at: new Date().toISOString() })
    .eq('id', joinPartidoId)
    .eq('estado', 'buscando')
    .select('id')
    .maybeSingle();
  if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 });
  if (!unido) {
    return NextResponse.json({ error: 'Alguien más se unió primero a ese trío — refresca la lista' }, { status: 409 });
  }

  const { error: jugadoresError } = await supabase
    .from('partido_rapido_jugadores')
    .insert(filasJugadoresLado(joinPartidoId, 'b', userId, companeros));
  if (jugadoresError) return NextResponse.json({ error: jugadoresError.message }, { status: 500 });

  const enriquecido = await fetchPartidoRapido(supabase, joinPartidoId);
  return NextResponse.json({ partido: enriquecido }, { status: 201 });
}

// ── Camino 2: reto directo a un jugador (o al Rey) — requiere aceptación ───
async function retarDirecto(
  supabase: SupabaseClient,
  userId: string,
  canchaId: string,
  rivalJugadorId: string,
  temporadaId: string | null,
  companeros: MiembroSquad[],
) {
  const { data: rivalProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', rivalJugadorId)
    .maybeSingle();
  if (!rivalProfile) return NextResponse.json({ error: 'El jugador retado no existe' }, { status: 404 });

  // Informativo: ¿el retado es el Rey 3v3 vigente de esta cancha ahora mismo?
  let kingQuery = supabase
    .from('cancha_dominio')
    .select('jugador_id')
    .eq('cancha_id', canchaId)
    .eq('formato', '3v3')
    .eq('es_king', true)
    .eq('jugador_id', rivalJugadorId);
  kingQuery = temporadaId ? kingQuery.eq('temporada_id', temporadaId) : kingQuery.is('temporada_id', null);
  const { data: kingMatch } = await kingQuery.maybeSingle();

  const { data: partido, error: insertError } = await supabase
    .from('partidos_rapidos')
    .insert({
      cancha_id: canchaId,
      deporte: 'basketball',
      formato: '3v3',
      temporada_id: temporadaId,
      capitan_a_id: userId,
      capitan_b_id: rivalJugadorId,
      es_vs_king: !!kingMatch,
      estado: 'pendiente',
    })
    .select('id')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: jugadoresError } = await supabase
    .from('partido_rapido_jugadores')
    .insert(filasJugadoresLado(partido.id, 'a', userId, companeros));
  if (jugadoresError) {
    await supabase.from('partidos_rapidos').delete().eq('id', partido.id);
    return NextResponse.json({ error: jugadoresError.message }, { status: 500 });
  }

  const enriquecido = await fetchPartidoRapido(supabase, partido.id);
  return NextResponse.json({ partido: enriquecido }, { status: 201 });
}

// ── Camino 3: buscar automáticamente (mutuo opt-in, sin reto específico) ───
async function buscarAutomaticamente(
  supabase: SupabaseClient,
  userId: string,
  canchaId: string,
  temporadaId: string | null,
  companeros: MiembroSquad[],
) {
  const { data: partido, error: insertError } = await supabase
    .from('partidos_rapidos')
    .insert({
      cancha_id: canchaId,
      deporte: 'basketball',
      formato: '3v3',
      temporada_id: temporadaId,
      capitan_a_id: userId,
      estado: 'buscando',
    })
    .select('id')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  const partidoId = partido.id as string;

  const { error: jugadoresError } = await supabase
    .from('partido_rapido_jugadores')
    .insert(filasJugadoresLado(partidoId, 'a', userId, companeros));
  if (jugadoresError) {
    await supabase.from('partidos_rapidos').delete().eq('id', partidoId);
    return NextResponse.json({ error: jugadoresError.message }, { status: 500 });
  }

  const { data: rivalPartidoId, error: rpcError } = await supabase.rpc('emparejar_partido_rapido', {
    p_partido_id: partidoId,
  });
  if (rpcError) {
    // No fatal: el partido queda "buscando" igual, se puede reintentar via poll.
    console.error('[partidos_rapidos] emparejar_partido_rapido error:', rpcError.message);
  }

  if (rivalPartidoId) {
    // Nos fusionamos dentro de la fila que ya estaba en el lobby: reasignamos
    // nuestras filas del lado 'a' (recién insertadas contra la fila propia,
    // que la función ya canceló) al lado 'b' de la fila ganadora.
    await supabase
      .from('partido_rapido_jugadores')
      .update({ partido_id: rivalPartidoId, lado: 'b' })
      .eq('partido_id', partidoId);

    const enriquecido = await fetchPartidoRapido(supabase, rivalPartidoId);
    return NextResponse.json({ partido: enriquecido }, { status: 201 });
  }

  const enriquecido = await fetchPartidoRapido(supabase, partidoId);
  return NextResponse.json({ partido: enriquecido }, { status: 201 });
}
