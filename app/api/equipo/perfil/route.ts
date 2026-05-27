import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MODALIDADES_VALIDAS = ['1v1','2v2','3v3','4v4','5v5','equipo_completo'] as const;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Get user's team + verify admin role
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .eq('rol', 'admin')
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    return NextResponse.json({ error: 'No eres administrador de ningún equipo' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.buscando_rival === 'boolean') {
    updates.buscando_rival = body.buscando_rival;
    // Turning off: also clear the modalidad
    if (!body.buscando_rival) updates.rival_modalidad = null;
  }

  if ('rival_modalidad' in body) {
    const mod = body.rival_modalidad;
    if (mod !== null && !(MODALIDADES_VALIDAS as readonly string[]).includes(mod)) {
      return NextResponse.json({ error: 'rival_modalidad inválida' }, { status: 400 });
    }
    updates.rival_modalidad = mod ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('equipos')
    .update(updates)
    .eq('id', membresia.equipo_id)
    .select('id, buscando_rival, rival_modalidad')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
