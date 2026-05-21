import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const deporte = request.nextUrl.searchParams.get('deporte');

  let query = supabase
    .from('canchas')
    .select(
      'id, nombre, direccion, lat, lng, deporte, validada, cancha_dominio(id, equipo_id, victorias, derrotas, es_king, equipos(id, nombre, color))'
    )
    .order('created_at', { ascending: false });

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
