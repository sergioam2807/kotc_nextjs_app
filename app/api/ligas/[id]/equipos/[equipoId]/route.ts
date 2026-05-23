import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string; equipoId: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/ligas/[id]/equipos/[equipoId]
// Organizer: can set estado, grupo, seed.
// Team admin/captain: can accept or reject their own invitation.
// Body: { estado?, grupo?, seed? }
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: Params) {
  const { id, equipoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id')
    .eq('id', id)
    .maybeSingle();
  if (!liga) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });

  const { data: le } = await supabase
    .from('liga_equipos')
    .select('id, equipo_id')
    .eq('liga_id', id)
    .eq('equipo_id', equipoId)
    .maybeSingle();
  if (!le) return NextResponse.json({ error: 'Equipo no encontrado en esta liga' }, { status: 404 });

  const esOrganizador = liga.organizador_id === user.id;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (esOrganizador) {
    const ESTADOS_VALIDOS_ORGANIZADOR = ['invitado', 'aceptado', 'rechazado', 'retirado'];
    if ('estado' in body) {
      if (!ESTADOS_VALIDOS_ORGANIZADOR.includes(body.estado)) {
        return NextResponse.json({ error: 'estado inválido' }, { status: 400 });
      }
      updates.estado = body.estado;
    }
    if ('grupo' in body) {
      if (body.grupo !== null && (typeof body.grupo !== 'string' || body.grupo.length > 10)) {
        return NextResponse.json({ error: 'grupo inválido (máx 10 caracteres)' }, { status: 400 });
      }
      updates.grupo = body.grupo;
    }
    if ('seed' in body) {
      if (body.seed !== null && (typeof body.seed !== 'number' || !Number.isInteger(body.seed) || body.seed < 1 || body.seed > 128)) {
        return NextResponse.json({ error: 'seed inválido (debe ser entero entre 1 y 128)' }, { status: 400 });
      }
      updates.seed = body.seed;
    }
  } else {
    // Team admin/captain can only accept/reject their own invite
    const { data: esAdmin } = await supabase
      .from('equipo_miembros')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('jugador_id', user.id)
      .in('rol', ['admin', 'capitan'])
      .maybeSingle();
    if (!esAdmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    if (body.estado !== 'aceptado' && body.estado !== 'rechazado') {
      return NextResponse.json({ error: 'Solo puedes aceptar o rechazar la invitación' }, { status: 400 });
    }
    updates.estado = body.estado;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  const { error } = await supabase.from('liga_equipos').update(updates).eq('id', le.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE /api/ligas/[id]/equipos/[equipoId] — remove team from liga
// ---------------------------------------------------------------------------
export async function DELETE(_req: Request, { params }: Params) {
  const { id, equipoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id, estado')
    .eq('id', id)
    .maybeSingle();
  if (!liga) return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });

  const esOrganizador = liga.organizador_id === user.id;

  if (!esOrganizador) {
    if (liga.estado === 'en_curso') {
      return NextResponse.json({ error: 'No puedes retirarte mientras la liga está en curso' }, { status: 400 });
    }
    const { data: esAdmin } = await supabase
      .from('equipo_miembros')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('jugador_id', user.id)
      .in('rol', ['admin', 'capitan'])
      .maybeSingle();
    if (!esAdmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const { error } = await supabase
    .from('liga_equipos')
    .delete()
    .eq('liga_id', id)
    .eq('equipo_id', equipoId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
