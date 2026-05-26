import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEPORTES_VALIDOS = ['basketball'];
const FORMATOS_VALIDOS = ['1v1'];

// ---------------------------------------------------------------------------
// GET /api/desafios-1v1
// Returns all 1v1 challenges where the current user is retador or retado.
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: desafiosRaw, error } = await supabase
    .from('desafios_individual')
    .select('*')
    .or(`retador_id.eq.${user.id},retado_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const desafios = desafiosRaw ?? [];
  if (desafios.length === 0) return NextResponse.json({ desafios: [] });

  // Fetch profiles for all involved players
  const jugadorIds = [
    ...new Set(desafios.flatMap(d => [d.retador_id, d.retado_id])),
  ].filter(Boolean);

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, nivel, xp')
    .in('id', jugadorIds);

  const profileMap = Object.fromEntries(
    (profilesRaw ?? []).map(p => [p.id, p]),
  );

  // Fetch results for challenges that have them
  const conResultadoIds = desafios
    .filter(d => ['resultado_pendiente', 'completado'].includes(d.estado))
    .map(d => d.id);

  const { data: resultadosRaw } = conResultadoIds.length
    ? await supabase
        .from('resultados_individual')
        .select('*')
        .in('desafio_id', conResultadoIds)
    : { data: [] };

  const resultadoMap = Object.fromEntries(
    (resultadosRaw ?? []).map(r => [r.desafio_id, r]),
  );

  const enriched = desafios.map(d => ({
    ...d,
    retador: profileMap[d.retador_id] ?? null,
    retado: profileMap[d.retado_id] ?? null,
    resultado: resultadoMap[d.id] ?? null,
  }));

  return NextResponse.json({ desafios: enriched, userId: user.id });
}

// ---------------------------------------------------------------------------
// POST /api/desafios-1v1
// Create a new 1v1 challenge.
// Body: { retado_id, deporte?, formato?, fecha?, mensaje?, cancha_id? }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    retado_id,
    deporte = 'basketball',
    formato = '1v1',
    fecha,
    mensaje,
    cancha_id,
  } = body;

  // ── Validaciones ────────────────────────────────────────────────────────────
  if (!retado_id || !UUID_RE.test(retado_id)) {
    return NextResponse.json({ error: 'retado_id inválido' }, { status: 400 });
  }
  if (retado_id === user.id) {
    return NextResponse.json({ error: 'No puedes desafiarte a ti mismo' }, { status: 400 });
  }
  if (!DEPORTES_VALIDOS.includes(deporte)) {
    return NextResponse.json({ error: 'deporte inválido' }, { status: 400 });
  }
  if (!FORMATOS_VALIDOS.includes(formato)) {
    return NextResponse.json({ error: 'formato inválido. Solo se acepta: 1v1' }, { status: 400 });
  }
  if (cancha_id !== undefined && cancha_id !== null && !UUID_RE.test(cancha_id)) {
    return NextResponse.json({ error: 'cancha_id inválido' }, { status: 400 });
  }
  if (fecha !== undefined && fecha !== null) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'fecha inválida' }, { status: 400 });
    }
    if (d < new Date()) {
      return NextResponse.json({ error: 'La fecha debe ser futura' }, { status: 400 });
    }
  }
  if (mensaje !== undefined && mensaje !== null && typeof mensaje === 'string' && mensaje.length > 300) {
    return NextResponse.json({ error: 'El mensaje no puede superar 300 caracteres' }, { status: 400 });
  }

  // Check retado_id actually exists as a profile
  const { data: retadoProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', retado_id)
    .maybeSingle();

  if (!retadoProfile) {
    return NextResponse.json({ error: 'El jugador retado no existe' }, { status: 404 });
  }

  // Prevent duplicate pending challenges between same pair
  const { data: existing } = await supabase
    .from('desafios_individual')
    .select('id')
    .or(
      `and(retador_id.eq.${user.id},retado_id.eq.${retado_id}),and(retador_id.eq.${retado_id},retado_id.eq.${user.id})`,
    )
    .eq('estado', 'pendiente')
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Ya existe un desafío 1v1 pendiente entre estos jugadores' },
      { status: 409 },
    );
  }

  // ── Insertar ────────────────────────────────────────────────────────────────
  const { data: inserted, error } = await supabase
    .from('desafios_individual')
    .insert({
      retador_id: user.id,
      retado_id,
      deporte,
      formato,
      fecha: fecha ?? null,
      mensaje: mensaje ?? null,
      cancha_id: cancha_id ?? null,
      estado: 'pendiente',
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ desafio: inserted }, { status: 201 });
}
