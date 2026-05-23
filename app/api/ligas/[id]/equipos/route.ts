import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/ligas/[id]/equipos
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('liga_equipos')
    .select('id, equipo_id, estado, grupo, seed, created_at, equipos(id, nombre, color, ciudad)')
    .eq('liga_id', id)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipos: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/ligas/[id]/equipos
// Organizer → auto-acepted invite.
// Team admin on public liga in inscripciones → estado 'invitado' (organizer accepts).
// Body: { equipo_id: string }
// ---------------------------------------------------------------------------
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { equipo_id } = await request.json();
  if (!equipo_id) return NextResponse.json({ error: 'equipo_id requerido' }, { status: 400 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id, estado, max_equipos, inscripcion_publica')
    .eq('id', id)
    .maybeSingle();

  if (!liga) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });

  const esOrganizador = liga.organizador_id === user.id;

  if (!esOrganizador) {
    if (!liga.inscripcion_publica) {
      return NextResponse.json({ error: 'Esta liga no admite inscripciones públicas' }, { status: 403 });
    }
    if (liga.estado !== 'inscripciones') {
      return NextResponse.json({ error: 'La liga no está en período de inscripciones' }, { status: 400 });
    }
    const { data: esAdmin } = await supabase
      .from('equipo_miembros')
      .select('id')
      .eq('equipo_id', equipo_id)
      .eq('jugador_id', user.id)
      .in('rol', ['admin', 'capitan'])
      .maybeSingle();
    if (!esAdmin) return NextResponse.json({ error: 'No eres admin/capitán de este equipo' }, { status: 403 });
  } else {
    if (!['borrador', 'inscripciones'].includes(liga.estado)) {
      return NextResponse.json({ error: 'No se pueden agregar equipos en este estado' }, { status: 400 });
    }
  }

  // Already enrolled?
  const { data: existing } = await supabase
    .from('liga_equipos')
    .select('id, estado')
    .eq('liga_id', id)
    .eq('equipo_id', equipo_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'El equipo ya está en esta liga' }, { status: 409 });
  }

  // Max teams (only accepted count)
  const { count: aceptados } = await supabase
    .from('liga_equipos')
    .select('id', { count: 'exact', head: true })
    .eq('liga_id', id)
    .eq('estado', 'aceptado');

  if ((aceptados ?? 0) >= liga.max_equipos) {
    return NextResponse.json({ error: 'La liga ya tiene el máximo de equipos' }, { status: 400 });
  }

  const { error } = await supabase.from('liga_equipos').insert({
    liga_id: id,
    equipo_id,
    estado: esOrganizador ? 'aceptado' : 'invitado',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
