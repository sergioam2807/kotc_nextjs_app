import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { estado } = await req.json(); // 'aceptada' | 'rechazada' | 'cancelada'
  if (!['aceptada', 'rechazada', 'cancelada'].includes(estado)) {
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 });
  }

  // Get the solicitud
  const { data: solicitud, error: solError } = await supabase
    .from('solicitudes_equipo')
    .select('id, equipo_id, jugador_id, estado')
    .eq('id', id)
    .maybeSingle();

  if (solError || !solicitud) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  }

  // Update estado
  const { error: updateError } = await supabase
    .from('solicitudes_equipo')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If accepted: add player to equipo_miembros
  if (estado === 'aceptada') {
    // Get equipo deporte
    const { data: equipo } = await supabase
      .from('equipos')
      .select('deporte')
      .eq('id', solicitud.equipo_id)
      .maybeSingle();

    const { error: memberError } = await supabase
      .from('equipo_miembros')
      .insert({
        equipo_id: solicitud.equipo_id,
        jugador_id: solicitud.jugador_id,
        rol: 'jugador',
        posicion: 'suplente',
        deporte: equipo?.deporte ?? 'basketball',
      });

    if (memberError && memberError.code !== '23505') {
      // Rollback: set solicitud back to pendiente
      await supabase
        .from('solicitudes_equipo')
        .update({ estado: 'pendiente', updated_at: new Date().toISOString() })
        .eq('id', id);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { error } = await supabase
    .from('solicitudes_equipo')
    .delete()
    .eq('id', id)
    .eq('jugador_id', user.id); // RLS: can only delete own

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
