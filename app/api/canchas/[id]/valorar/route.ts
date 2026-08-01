import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/canchas/[id]/valorar ───────────────────────────────────────────
// Upserts a star rating (1–5) for a court.
// The DB trigger (_update_cancha_valoracion) auto-updates canchas.valoracion_promedio
// and canchas.valoracion_count after each insert/update.
//
// Body: { estrellas: 1|2|3|4|5 }
// Returns: { valoracion_promedio: number|null, valoracion_count: number, mi_valoracion: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: canchaId } = await params;

    if (!UUID_RE.test(canchaId)) {
      return NextResponse.json({ error: 'ID de cancha inválido' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const estrellas = body.estrellas;
    if (
      typeof estrellas !== 'number' ||
      !Number.isInteger(estrellas) ||
      estrellas < 1 ||
      estrellas > 5
    ) {
      return NextResponse.json(
        { error: '"estrellas" debe ser un entero entre 1 y 5' },
        { status: 400 }
      );
    }

    // Verify the court exists
    const { data: cancha } = await supabase
      .from('canchas')
      .select('id')
      .eq('id', canchaId)
      .maybeSingle();

    if (!cancha) {
      return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    }

    // Upsert rating (RLS ensures jugador_id = auth.uid())
    const { error: upsertErr } = await supabase
      .from('cancha_valoraciones')
      .upsert(
        {
          cancha_id:  canchaId,
          jugador_id: user.id,
          estrellas:  estrellas as number,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cancha_id,jugador_id' }
      );

    if (upsertErr) {
      console.error('[POST /api/canchas/valorar] upsert error', upsertErr);
      return NextResponse.json({ error: 'Error al guardar la valoración' }, { status: 500 });
    }

    // Read back updated aggregate from canchas (trigger already ran)
    const { data: updated } = await supabase
      .from('canchas')
      .select('valoracion_promedio, valoracion_count')
      .eq('id', canchaId)
      .maybeSingle();

    return NextResponse.json({
      valoracion_promedio: updated?.valoracion_promedio ?? null,
      valoracion_count:    updated?.valoracion_count    ?? 0,
      mi_valoracion:       estrellas,
    });
  } catch (err) {
    console.error('[POST /api/canchas/valorar]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
