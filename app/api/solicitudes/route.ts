import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { equipo_id, mensaje } = await req.json();
  if (!equipo_id) return NextResponse.json({ error: 'equipo_id requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('solicitudes_equipo')
    .insert({ equipo_id, jugador_id: user.id, mensaje: mensaje || null })
    .select()
    .single();

  if (error) {
    // duplicate key = already sent
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente para este equipo' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  if (tipo === 'mias') {
    // Player sees their own solicitudes
    const { data, error } = await supabase
      .from('solicitudes_equipo')
      .select('id, equipo_id, estado, mensaje, created_at, equipos(nombre, color, deporte)')
      .eq('jugador_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Team admin sees solicitudes for their team
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .in('rol', ['admin', 'capitan'])
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    return NextResponse.json({ error: 'No eres admin de ningún equipo' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('solicitudes_equipo')
    .select(
      'id, jugador_id, estado, mensaje, created_at, profiles(username, display_name, avatar_url, nivel, xp, posicion_principal, especialidades, deportes_activos, disponible_reclutamiento)',
    )
    .eq('equipo_id', membresia.equipo_id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
