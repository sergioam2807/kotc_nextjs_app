import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  cambiosDeModeracion,
  ACCIONES_MODERACION,
  type AccionModeracion,
} from '@/lib/canchas/moderacion';

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/admin/canchas/[id] — moderar una cancha descubierta.
 *
 * Body: { accion: 'aprobar' | 'rechazar' | 'cerrar' }
 *
 * No borra nada: una cancha rechazada queda registrada para no volver a
 * proponerla, y sigue ocupando su `google_place_id` en el índice único.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const accion = (body as { accion?: unknown } | null)?.accion;

  if (typeof accion !== 'string' || !ACCIONES_MODERACION.includes(accion as AccionModeracion)) {
    return NextResponse.json(
      { error: `accion inválida. Valores: ${ACCIONES_MODERACION.join(', ')}` },
      { status: 400 },
    );
  }

  const cambios = cambiosDeModeracion(accion as AccionModeracion);

  const { data, error } = await supabase
    .from('canchas')
    .update(cambios)
    .eq('id', id)
    .select('id, nombre, status, validada')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    // La policy "cancha editar" (migración 045) limita el UPDATE a
    // `auth.uid() = agregada_por`. Las canchas descubiertas quedan a nombre del
    // admin que corrió la importación, así que el flujo normal pasa; una cancha
    // dada de alta por un jugador, no. Sin este chequeo las dos situaciones se
    // veían igual: un 404 que miente.
    const { data: existe } = await supabase
      .from('canchas')
      .select('id, agregada_por')
      .eq('id', id)
      .maybeSingle();

    if (!existe) return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    return NextResponse.json(
      { error: 'Esta cancha no la creó el descubrimiento; la RLS solo permite editarla a quien la dio de alta' },
      { status: 403 },
    );
  }

  return NextResponse.json({ cancha: data });
}
