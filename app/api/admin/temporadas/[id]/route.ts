import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

// PATCH /api/admin/temporadas/[id] — activate or close a season
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: { accion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { accion } = body;
  if (!accion || !['activar', 'cerrar'].includes(accion)) {
    return NextResponse.json({ error: "accion debe ser 'activar' o 'cerrar'" }, { status: 400 });
  }

  // Verify temporada exists
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nombre, activa')
    .eq('id', id)
    .maybeSingle();

  if (!temporada) {
    return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
  }

  if (accion === 'activar') {
    if (temporada.activa) {
      return NextResponse.json({ error: 'La temporada ya está activa' }, { status: 409 });
    }

    // Deactivate all others
    await supabase.from('temporadas').update({ activa: false }).eq('activa', true);

    const { error } = await supabase
      .from('temporadas')
      .update({ activa: true })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, mensaje: 'Temporada activada' });
  }

  // accion === 'cerrar'
  if (!temporada.activa) {
    return NextResponse.json({ error: 'La temporada ya está cerrada' }, { status: 409 });
  }

  // Snapshot current kings into historial_kings before closing
  // racha_defensiva added in migration 028; fecha_rey_desde is the reign start date
  const { data: kings } = await supabase
    .from('cancha_dominio')
    .select('cancha_id, equipo_id, victorias, racha_defensiva, fecha_rey_desde')
    .eq('es_king', true);

  if (kings && kings.length > 0) {
    const snapshots = kings.map(k => ({
      cancha_id: k.cancha_id,
      equipo_id: k.equipo_id,
      temporada_id: id,
      fecha_inicio: (k as { fecha_rey_desde?: string | null }).fecha_rey_desde ?? new Date().toISOString(),
      fecha_fin: new Date().toISOString(),
      victorias_reinado: k.victorias ?? 0,
      racha_max: (k as { racha_defensiva?: number }).racha_defensiva ?? 0,
    }));

    await supabase.from('historial_kings').insert(snapshots);
  }

  // Close the season
  const { error } = await supabase
    .from('temporadas')
    .update({ activa: false })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    mensaje: `Temporada cerrada. ${kings?.length ?? 0} snapshots de Kings guardados.`,
  });
}

// DELETE /api/admin/temporadas/[id] — delete a season (only if inactive)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, activa')
    .eq('id', id)
    .maybeSingle();

  if (!temporada) {
    return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
  }

  if (temporada.activa) {
    return NextResponse.json({ error: 'No puedes eliminar una temporada activa. Ciérrala primero.' }, { status: 409 });
  }

  const { error } = await supabase.from('temporadas').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
