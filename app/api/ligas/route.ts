import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// GET /api/ligas — public list of active leagues
// ---------------------------------------------------------------------------
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ligas, error } = await supabase
    .from('ligas')
    .select(`
      id, nombre, deporte, modalidad, formato, estado, max_equipos,
      inscripcion_publica, fecha_inicio, fecha_fin, organizador_id, created_at,
      liga_equipos(count)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // RLS already filters borrador for non-organizers, but we also filter client-side
  const filtered = (ligas ?? []).filter(
    l => l.estado !== 'borrador' || (user && l.organizador_id === user.id)
  );

  return NextResponse.json({ ligas: filtered });
}

// ---------------------------------------------------------------------------
// POST /api/ligas — create a league (requires active subscription)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Verify active subscription
  const { data: suscripcion } = await supabase
    .from('suscripciones')
    .select('id')
    .eq('user_id', user.id)
    .eq('estado', 'activa')
    .gte('fecha_fin', new Date().toISOString().split('T')[0])
    .maybeSingle();

  if (!suscripcion) {
    return NextResponse.json(
      { error: 'Necesitas una suscripción activa de organizador para crear ligas.' },
      { status: 403 },
    );
  }

  const body = await request.json();
  const {
    nombre, descripcion, deporte, modalidad, formato,
    max_equipos = 8, inscripcion_publica = false,
    fecha_inicio, fecha_fin,
    puntos_victoria = 3, puntos_empate = 1, puntos_derrota = 0,
    num_grupos = 2, equipos_clasifican = 2,
  } = body;

  if (!nombre?.trim())    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  if (!deporte)           return NextResponse.json({ error: 'Deporte requerido' }, { status: 400 });
  if (!modalidad)         return NextResponse.json({ error: 'Modalidad requerida' }, { status: 400 });
  if (!['round_robin', 'eliminacion_directa', 'grupos_playoffs'].includes(formato)) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
  }

  // Length and range guards
  if (nombre.trim().length > 100) {
    return NextResponse.json({ error: 'nombre demasiado largo (máx 100 caracteres)' }, { status: 400 });
  }
  if (descripcion && typeof descripcion === 'string' && descripcion.length > 500) {
    return NextResponse.json({ error: 'descripcion demasiado larga (máx 500 caracteres)' }, { status: 400 });
  }
  const DEPORTES_VALIDOS = ['basketball', 'futbol', 'voleibol', 'tenis', 'padel'];
  if (!DEPORTES_VALIDOS.includes(deporte)) {
    return NextResponse.json({ error: 'deporte inválido' }, { status: 400 });
  }
  if (typeof max_equipos !== 'number' || !Number.isInteger(max_equipos) || max_equipos < 2 || max_equipos > 64) {
    return NextResponse.json({ error: 'max_equipos debe ser entero entre 2 y 64' }, { status: 400 });
  }
  for (const [field, val] of [['puntos_victoria', puntos_victoria], ['puntos_empate', puntos_empate], ['puntos_derrota', puntos_derrota]] as [string, number][]) {
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 99) {
      return NextResponse.json({ error: `${field} inválido (0–99)` }, { status: 400 });
    }
  }

  const { data: liga, error } = await supabase
    .from('ligas')
    .insert({
      organizador_id:     user.id,
      nombre:             nombre.trim(),
      descripcion:        descripcion?.trim() || null,
      deporte,
      modalidad,
      formato,
      max_equipos,
      inscripcion_publica,
      fecha_inicio:       fecha_inicio || null,
      fecha_fin:          fecha_fin    || null,
      puntos_victoria,
      puntos_empate,
      puntos_derrota,
      num_grupos:         formato === 'grupos_playoffs' ? num_grupos        : null,
      equipos_clasifican: formato === 'grupos_playoffs' ? equipos_clasifican : null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ liga }, { status: 201 });
}
