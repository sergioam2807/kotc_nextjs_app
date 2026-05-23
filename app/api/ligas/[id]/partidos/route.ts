import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/ligas/[id]/partidos
// Query: ?fase=…&grupo=…&ronda=…&estado=…
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const url = new URL(request.url);

  let query = supabase
    .from('liga_partidos')
    .select(`
      id, ronda, fase, grupo, estado, fecha, puntos_local, puntos_visitante, ganador_id, created_at,
      equipo_local:equipos!liga_partidos_equipo_local_id_fkey(id, nombre, color),
      equipo_visitante:equipos!liga_partidos_equipo_visitante_id_fkey(id, nombre, color),
      canchas(id, nombre, direccion)
    `)
    .eq('liga_id', id)
    .order('ronda', { ascending: true })
    .order('created_at', { ascending: true });

  const fase   = url.searchParams.get('fase');
  const grupo  = url.searchParams.get('grupo');
  const ronda  = url.searchParams.get('ronda');
  const estado = url.searchParams.get('estado');

  if (fase)   query = query.eq('fase', fase);
  if (grupo)  query = query.eq('grupo', grupo);
  if (ronda)  query = query.eq('ronda', parseInt(ronda));
  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partidos: data ?? [] });
}
