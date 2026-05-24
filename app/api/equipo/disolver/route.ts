import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// DELETE — disolver el equipo (solo el admin)
// Restricciones:
//   - El caller debe ser admin del equipo
//   - No se puede disolver mientras hay una temporada en curso
// Orden de eliminación (respetar FKs):
//   cancha_dominio → solicitudes_equipo → invitaciones
//   → resultados (de desafíos del equipo) → desafios
//   → equipo_miembros (dispara trigger historial_equipos: fecha_salida)
//   → equipos (dispara ON DELETE SET NULL en historial_equipos.equipo_id)
// ---------------------------------------------------------------------------
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Verificar que el caller es admin de algún equipo
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .eq('rol', 'admin')
    .maybeSingle();

  if (!membresia) {
    return NextResponse.json({ error: 'No eres administrador de ningún equipo' }, { status: 403 });
  }

  const equipoId = membresia.equipo_id;

  // Obtener datos del equipo
  const { data: equipo } = await supabase
    .from('equipos')
    .select('id, nombre, temporada_id')
    .eq('id', equipoId)
    .maybeSingle();

  if (!equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

  // Bloqueo por temporada activa
  if (equipo.temporada_id) {
    const { data: temporada } = await supabase
      .from('temporadas')
      .select('activa, inicio, fin')
      .eq('id', equipo.temporada_id)
      .maybeSingle();

    const hoy = new Date().toISOString().split('T')[0];
    const temporadaComenzo =
      temporada?.activa &&
      temporada.inicio <= hoy &&
      temporada.fin >= hoy;

    if (temporadaComenzo) {
      return NextResponse.json(
        { error: 'No puedes disolver el equipo mientras la temporada está en curso.' },
        { status: 403 },
      );
    }
  }

  // [C-3] Use the transactional SQL function (migration 025_security_fixes.sql).
  // All 6 delete steps run inside a single PostgreSQL transaction — if any step
  // fails, the entire dissolution is rolled back, preventing corrupt state.
  const { error: errDisolver } = await supabase.rpc('disolver_equipo', {
    p_equipo_id: equipoId,
    p_user_id:   user.id,
  });

  if (errDisolver) {
    // Log internal detail, return a generic message to the client
    console.error('[disolver_equipo]', errDisolver.message);
    return NextResponse.json(
      { error: 'No se pudo disolver el equipo. Intenta nuevamente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
