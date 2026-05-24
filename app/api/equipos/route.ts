import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get('ciudad');
  const deporte = searchParams.get('deporte');

  // Validate deporte filter
  const DEPORTES_VALIDOS = ['basketball', 'futbol', 'voleibol', 'tenis', 'padel'];
  if (deporte && !DEPORTES_VALIDOS.includes(deporte)) {
    return NextResponse.json({ error: 'deporte inválido' }, { status: 400 });
  }
  // ciudad length guard (prevent long strings being sent to DB)
  if (ciudad && ciudad.length > 100) {
    return NextResponse.json({ error: 'ciudad demasiado larga' }, { status: 400 });
  }

  let query = supabase
    .from('equipos')
    .select('*, equipo_miembros(count)')
    .order('xp', { ascending: false })
    .limit(200); // Prevent unbounded scan on ranking/search views

  if (ciudad) query = query.eq('ciudad', ciudad);
  if (deporte) query = query.eq('deporte', deporte);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();

  // [C-5] Whitelist — never spread body directly to prevent mass assignment
  // (e.g. nivel, xp, temporada_id could be injected)
  const { nombre, deporte, modalidad, ciudad, color } = body;

  if (!nombre?.trim() || !deporte || !modalidad) {
    return NextResponse.json(
      { error: 'nombre, deporte y modalidad son requeridos' },
      { status: 400 }
    );
  }

  // Field validation
  if (typeof nombre !== 'string' || nombre.trim().length > 60) {
    return NextResponse.json({ error: 'nombre inválido (máx 60 caracteres)' }, { status: 400 });
  }
  const DEPORTES_VALIDOS = ['basketball', 'futbol', 'voleibol', 'tenis', 'padel'];
  if (!DEPORTES_VALIDOS.includes(deporte)) {
    return NextResponse.json({ error: 'deporte inválido' }, { status: 400 });
  }
  const MODALIDADES_VALIDAS = ['1v1', '3v3', '5v5', '6v6', 'libre'];
  if (!MODALIDADES_VALIDAS.includes(modalidad)) {
    return NextResponse.json({ error: 'modalidad inválida' }, { status: 400 });
  }
  if (ciudad !== undefined && ciudad !== null && (typeof ciudad !== 'string' || ciudad.length > 100)) {
    return NextResponse.json({ error: 'ciudad inválida (máx 100 caracteres)' }, { status: 400 });
  }
  // Color: must be a valid hex color if provided
  if (color !== undefined && color !== null) {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
      return NextResponse.json({ error: 'color inválido (debe ser hex, ej: #F5C344)' }, { status: 400 });
    }
  }

  const { data: equipo, error } = await supabase
    .from('equipos')
    .insert({
      nombre: nombre.trim(),
      deporte,
      modalidad,
      ciudad: ciudad ?? null,
      color: color ?? '#F5C344',
      creador_id: user.id,
      // nivel and xp take DB defaults (1 and 0)
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('equipo_miembros').insert({
    equipo_id: equipo.id,
    jugador_id: user.id,
    rol: 'admin',
    posicion: 'titular',
    deporte,
  });

  return NextResponse.json(equipo, { status: 201 });
}
