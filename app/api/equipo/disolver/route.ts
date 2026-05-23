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

  // -------------------------------------------------------------------------
  // 1. Canchas bajo dominio
  // -------------------------------------------------------------------------
  const { error: errDominio } = await supabase
    .from('cancha_dominio')
    .delete()
    .eq('equipo_id', equipoId);
  if (errDominio) return NextResponse.json({ error: errDominio.message }, { status: 500 });

  // -------------------------------------------------------------------------
  // 2. Solicitudes de ingreso
  // -------------------------------------------------------------------------
  const { error: errSolicitudes } = await supabase
    .from('solicitudes_equipo')
    .delete()
    .eq('equipo_id', equipoId);
  if (errSolicitudes) return NextResponse.json({ error: errSolicitudes.message }, { status: 500 });

  // -------------------------------------------------------------------------
  // 3. Invitaciones
  // -------------------------------------------------------------------------
  const { error: errInvitaciones } = await supabase
    .from('invitaciones')
    .delete()
    .eq('equipo_id', equipoId);
  if (errInvitaciones) return NextResponse.json({ error: errInvitaciones.message }, { status: 500 });

  // -------------------------------------------------------------------------
  // 4. Resultados + desafíos que involucran al equipo
  // -------------------------------------------------------------------------
  const { data: desafiosEquipo } = await supabase
    .from('desafios')
    .select('id')
    .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`);

  if (desafiosEquipo && desafiosEquipo.length > 0) {
    const desafioIds = desafiosEquipo.map(d => d.id);

    const { error: errResultados } = await supabase
      .from('resultados')
      .delete()
      .in('desafio_id', desafioIds);
    if (errResultados) return NextResponse.json({ error: errResultados.message }, { status: 500 });

    const { error: errDesafios } = await supabase
      .from('desafios')
      .delete()
      .in('id', desafioIds);
    if (errDesafios) return NextResponse.json({ error: errDesafios.message }, { status: 500 });
  }

  // -------------------------------------------------------------------------
  // 5. Miembros — dispara trigger que actualiza historial_equipos.fecha_salida
  // -------------------------------------------------------------------------
  const { error: errMiembros } = await supabase
    .from('equipo_miembros')
    .delete()
    .eq('equipo_id', equipoId);
  if (errMiembros) return NextResponse.json({ error: errMiembros.message }, { status: 500 });

  // -------------------------------------------------------------------------
  // 6. Equipo — ON DELETE SET NULL en historial_equipos.equipo_id
  // -------------------------------------------------------------------------
  const { error: errEquipo } = await supabase
    .from('equipos')
    .delete()
    .eq('id', equipoId);
  if (errEquipo) return NextResponse.json({ error: errEquipo.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
