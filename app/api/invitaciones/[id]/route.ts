import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// PATCH /api/invitaciones/[id]
// Allows the invited player to reject an invitation (sets estado → 'expirada')
// Body: { accion: 'rechazar' }
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { accion } = body;

  if (accion !== 'rechazar') {
    return NextResponse.json({ error: 'accion inválida. Solo se acepta: rechazar' }, { status: 400 });
  }

  // Verify the invitation belongs to this user and is still pending
  const { data: inv, error: fetchErr } = await supabase
    .from('invitaciones')
    .select('id, estado, jugador_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
  if (inv.jugador_id !== user.id) {
    return NextResponse.json({ error: 'Sin permisos para rechazar esta invitación' }, { status: 403 });
  }
  if (inv.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Esta invitación ya no está pendiente' }, { status: 409 });
  }

  // Mark as 'expirada' — effectively rejected; allows admin to re-invite
  const { error: updateErr } = await supabase
    .from('invitaciones')
    .update({ estado: 'expirada' })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
