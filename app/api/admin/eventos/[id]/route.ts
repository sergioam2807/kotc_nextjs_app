import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

const VALID_TIPOS = [
  'torneo_express', 'bonus_xp', 'cancha_especial',
  'nightball', 'king_challenge', 'reto_semanal', 'otro',
] as const;

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

// PATCH /api/admin/eventos/[id] — update event
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  // Verify event exists
  const { data: existing } = await supabase
    .from('eventos')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });

  // Build update object — only allow known fields
  const updates: Record<string, unknown> = {};

  if (body.nombre !== undefined) {
    if (!String(body.nombre).trim()) return NextResponse.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });
    updates.nombre = String(body.nombre).trim();
  }
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion ? String(body.descripcion).trim() : null;
  if (body.tipo !== undefined) {
    if (!VALID_TIPOS.includes(body.tipo as typeof VALID_TIPOS[number])) {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }
    updates.tipo = body.tipo;
  }
  if (body.fecha_inicio !== undefined) updates.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) updates.fecha_fin = body.fecha_fin;
  if (body.activo !== undefined) updates.activo = Boolean(body.activo);
  if (body.color !== undefined) {
    if (body.color && !HEX_REGEX.test(String(body.color))) {
      return NextResponse.json({ error: 'Color inválido.' }, { status: 400 });
    }
    updates.color = body.color ?? null;
  }
  if (body.emoji !== undefined) updates.emoji = body.emoji ? String(body.emoji).trim() : null;
  if (body.premio !== undefined) updates.premio = body.premio ? String(body.premio).trim() : null;
  if (body.reglas !== undefined) updates.reglas = body.reglas ? String(body.reglas).trim() : null;
  if (body.bonus_xp_mult !== undefined) {
    if (body.bonus_xp_mult !== null) {
      const mult = Number(body.bonus_xp_mult);
      if (isNaN(mult) || mult < 1 || mult > 10) {
        return NextResponse.json({ error: 'Multiplicador XP debe estar entre 1 y 10.' }, { status: 400 });
      }
      updates.bonus_xp_mult = mult;
    } else {
      updates.bonus_xp_mult = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios para aplicar.' }, { status: 400 });
  }

  const { data: evento, error } = await supabase
    .from('eventos')
    .update(updates)
    .eq('id', id)
    .select('id, nombre, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ evento });
}

// DELETE /api/admin/eventos/[id] — delete event
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

  const { data: existing } = await supabase
    .from('eventos')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });

  const { error } = await supabase.from('eventos').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
