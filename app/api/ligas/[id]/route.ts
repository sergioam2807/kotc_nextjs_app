import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/ligas/[id] — liga detail with teams
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: liga, error } = await supabase
    .from('ligas')
    .select(`
      id, nombre, descripcion, deporte, modalidad, formato, estado, max_equipos,
      fecha_inicio, fecha_fin, inscripcion_publica, organizador_id, created_at,
      puntos_victoria, puntos_empate, puntos_derrota, num_grupos, equipos_clasifican,
      liga_equipos(
        id, equipo_id, estado, grupo, seed, created_at,
        equipos(id, nombre, color, ciudad)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!liga)  return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });

  return NextResponse.json({ liga });
}

// ---------------------------------------------------------------------------
// PATCH /api/ligas/[id] — update liga (organizer only)
// Handles field updates AND state transitions.
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id, estado')
    .eq('id', id)
    .maybeSingle();

  if (!liga)                     return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
  if (liga.organizador_id !== user.id) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await request.json();
  const ALLOWED = [
    'nombre', 'descripcion', 'fecha_inicio', 'fecha_fin', 'max_equipos',
    'inscripcion_publica', 'puntos_victoria', 'puntos_empate', 'puntos_derrota',
    'num_grupos', 'equipos_clasifican', 'estado',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  // Validate state transition
  if (updates.estado) {
    const VALID: Record<string, string[]> = {
      borrador:      ['inscripciones', 'cancelada'],
      inscripciones: ['en_curso', 'cancelada'],
      en_curso:      ['finalizada', 'cancelada'],
    };
    if (!(VALID[liga.estado] ?? []).includes(updates.estado as string)) {
      return NextResponse.json(
        { error: `No se puede cambiar de '${liga.estado}' a '${updates.estado}'` },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase.from('ligas').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE /api/ligas/[id] — delete liga (not allowed while en_curso)
// ---------------------------------------------------------------------------
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: liga } = await supabase
    .from('ligas')
    .select('organizador_id, estado')
    .eq('id', id)
    .maybeSingle();

  if (!liga)                     return NextResponse.json({ error: 'Liga no encontrada' }, { status: 404 });
  if (liga.organizador_id !== user.id) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  if (liga.estado === 'en_curso') {
    return NextResponse.json({ error: 'Cancela la liga antes de eliminarla' }, { status: 400 });
  }

  const { error } = await supabase.from('ligas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
