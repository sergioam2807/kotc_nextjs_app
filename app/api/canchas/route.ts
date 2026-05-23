import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const deporte = request.nextUrl.searchParams.get('deporte');

  // Validate deporte filter to prevent unexpected query injection
  const DEPORTES_VALIDOS = ['basketball', 'futbol', 'voleibol', 'tenis', 'padel'];
  if (deporte && !DEPORTES_VALIDOS.includes(deporte)) {
    return Response.json({ error: 'deporte inválido' }, { status: 400 });
  }

  let query = supabase
    .from('canchas')
    .select(
      'id, nombre, direccion, lat, lng, deporte, validada, cancha_dominio(id, equipo_id, victorias, derrotas, es_king, equipos(id, nombre, color))'
    )
    .order('created_at', { ascending: false })
    .limit(500); // Guard against unbounded table scans on the mapa endpoint

  if (deporte) {
    query = query.contains('deporte', [deporte]);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { nombre, direccion, lat, lng, deporte, horarios } = body;

  if (!nombre || !direccion || lat == null || lng == null || !deporte) {
    return Response.json(
      { error: 'Faltan campos requeridos: nombre, direccion, lat, lng, deporte' },
      { status: 400 }
    );
  }

  // Type and range validation
  if (typeof nombre !== 'string' || nombre.trim().length === 0 || nombre.length > 120) {
    return Response.json({ error: 'nombre inválido (máx 120 caracteres)' }, { status: 400 });
  }
  if (typeof direccion !== 'string' || direccion.trim().length === 0 || direccion.length > 250) {
    return Response.json({ error: 'direccion inválida (máx 250 caracteres)' }, { status: 400 });
  }
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return Response.json({ error: 'lat debe ser un número entre -90 y 90' }, { status: 400 });
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    return Response.json({ error: 'lng debe ser un número entre -180 y 180' }, { status: 400 });
  }
  if (!Array.isArray(deporte) || deporte.length === 0) {
    return Response.json({ error: 'deporte debe ser un array no vacío' }, { status: 400 });
  }
  const DEPORTES_VALIDOS = ['basketball', 'futbol', 'voleibol', 'tenis', 'padel'];
  if (!deporte.every((d: unknown) => typeof d === 'string' && DEPORTES_VALIDOS.includes(d))) {
    return Response.json({ error: 'deporte contiene valores inválidos' }, { status: 400 });
  }

  const { data: cancha, error: insertError } = await supabase
    .from('canchas')
    .insert({
      nombre,
      direccion,
      lat,
      lng,
      deporte,
      horarios: horarios ?? {},
      agregada_por: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const { error: xpError } = await supabase.rpc('add_xp', {
    target_user_id: user.id,
    amount: 80,
  });

  if (xpError) {
    console.error('add_xp error:', xpError.message);
  }

  return Response.json({ cancha, xp_ganado: 80 }, { status: 201 });
}
