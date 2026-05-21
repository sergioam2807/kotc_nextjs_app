import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get('ciudad');
  const deporte = searchParams.get('deporte');

  let query = supabase
    .from('equipos')
    .select('*, equipo_miembros(count)')
    .order('xp', { ascending: false });

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
  const { data: equipo, error } = await supabase
    .from('equipos')
    .insert({ ...body, creador_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('equipo_miembros').insert({
    equipo_id: equipo.id,
    jugador_id: user.id,
    rol: 'admin',
    posicion: 'titular',
    deporte: body.deporte,
  });

  return NextResponse.json(equipo, { status: 201 });
}
