import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string; partidoId: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/ligas/[id]/partidos/[partidoId] — record result (organizer only)
// Body: { puntos_local: number, puntos_visitante: number, fecha?: string, cancha_id?: string }
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: Params) {
  const { id, partidoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id')
    .eq('id', id)
    .maybeSingle();
  if (!liga)                         return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
  if (liga.organizador_id !== user.id) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { data: partido } = await supabase
    .from('liga_partidos')
    .select('id, equipo_local_id, equipo_visitante_id')
    .eq('id', partidoId)
    .eq('liga_id', id)
    .maybeSingle();
  if (!partido) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });

  const body = await request.json();
  const { puntos_local, puntos_visitante, fecha, cancha_id } = body;

  if (puntos_local === undefined || puntos_visitante === undefined) {
    return NextResponse.json({ error: 'puntos_local y puntos_visitante son requeridos' }, { status: 400 });
  }
  if (typeof puntos_local !== 'number' || typeof puntos_visitante !== 'number') {
    return NextResponse.json({ error: 'Los puntos deben ser números' }, { status: 400 });
  }
  if (puntos_local < 0 || puntos_visitante < 0) {
    return NextResponse.json({ error: 'Los puntos no pueden ser negativos' }, { status: 400 });
  }

  // Basketball is always decided (overtime) — a draw is not a valid result.
  if (puntos_local === puntos_visitante) {
    return NextResponse.json(
      { error: 'No se permiten empates — debe haber un ganador' },
      { status: 400 },
    );
  }

  const ganador_id = puntos_local > puntos_visitante ? partido.equipo_local_id : partido.equipo_visitante_id;

  const updates: Record<string, unknown> = {
    puntos_local,
    puntos_visitante,
    ganador_id,
    estado: 'completado',
  };
  if (fecha !== undefined)     updates.fecha     = fecha;
  if (cancha_id !== undefined) updates.cancha_id = cancha_id;

  const { error } = await supabase.from('liga_partidos').update(updates).eq('id', partidoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
