import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// PATCH /api/desafios-1v1/[id]
// Transition states for a 1v1 challenge.
// Body: { accion: 'aceptar' | 'rechazar' | 'marcar_jugado' | 'cancelar' }
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { accion } = body;

  if (!['aceptar', 'rechazar', 'marcar_jugado', 'cancelar'].includes(accion)) {
    return NextResponse.json(
      { error: 'accion inválida. Valores aceptados: aceptar, rechazar, marcar_jugado, cancelar' },
      { status: 400 },
    );
  }

  // Load the challenge
  const { data: desafio, error: fetchErr } = await supabase
    .from('desafios_individual')
    .select('id, retador_id, retado_id, estado')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  const isRetador = desafio.retador_id === user.id;
  const isRetado  = desafio.retado_id  === user.id;

  if (!isRetador && !isRetado) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  // ── FSM transitions ─────────────────────────────────────────────────────────
  let nuevoEstado: string | null = null;

  if (accion === 'aceptar') {
    if (!isRetado) return NextResponse.json({ error: 'Solo el retado puede aceptar' }, { status: 403 });
    if (desafio.estado !== 'pendiente') return NextResponse.json({ error: 'Solo se puede aceptar un desafío pendiente' }, { status: 409 });
    nuevoEstado = 'aceptado';
  }

  if (accion === 'rechazar') {
    if (!isRetado) return NextResponse.json({ error: 'Solo el retado puede rechazar' }, { status: 403 });
    if (desafio.estado !== 'pendiente') return NextResponse.json({ error: 'Solo se puede rechazar un desafío pendiente' }, { status: 409 });
    nuevoEstado = 'rechazado';
  }

  if (accion === 'cancelar') {
    if (!isRetador) return NextResponse.json({ error: 'Solo el retador puede cancelar' }, { status: 403 });
    if (desafio.estado !== 'pendiente') return NextResponse.json({ error: 'Solo se puede cancelar un desafío pendiente' }, { status: 409 });
    nuevoEstado = 'rechazado'; // reuse 'rechazado' as cancelled state
  }

  if (accion === 'marcar_jugado') {
    if (!isRetador && !isRetado) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    if (desafio.estado !== 'aceptado') return NextResponse.json({ error: 'Solo se puede marcar como jugado un desafío aceptado' }, { status: 409 });
    nuevoEstado = 'resultado_pendiente';
  }

  if (!nuevoEstado) {
    return NextResponse.json({ error: 'Transición de estado no válida' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('desafios_individual')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, estado: nuevoEstado });
}
