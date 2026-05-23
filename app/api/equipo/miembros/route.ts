import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// PATCH — cambiar posición de un miembro (solo admin del equipo)
// Body: { miembro_id: string, posicion: 'titular' | 'suplente' }
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { miembro_id, posicion } = await request.json();

  if (!['titular', 'suplente'].includes(posicion)) {
    return NextResponse.json({ error: 'posicion inválida' }, { status: 400 });
  }

  // Obtener el miembro objetivo
  const { data: miembro } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, jugador_id, rol')
    .eq('id', miembro_id)
    .maybeSingle();

  if (!miembro) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });

  // Verificar que el caller es admin/capitán del mismo equipo
  const { data: miAdmin } = await supabase
    .from('equipo_miembros')
    .select('rol')
    .eq('equipo_id', miembro.equipo_id)
    .eq('jugador_id', user.id)
    .in('rol', ['admin', 'capitan'])
    .maybeSingle();

  if (!miAdmin) {
    return NextResponse.json({ error: 'Sin permisos para cambiar posición' }, { status: 403 });
  }

  const { error } = await supabase
    .from('equipo_miembros')
    .update({ posicion })
    .eq('id', miembro_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// DELETE — salir del equipo o expulsar un miembro
// Body: { miembro_id: string }
// Restricciones:
//   - Un admin NO puede abandonar su equipo (debe disolverlo)
//   - Nadie puede salir si hay una temporada activa que ya comenzó
// ---------------------------------------------------------------------------
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { miembro_id } = await request.json();

  // Obtener datos del miembro objetivo
  const { data: miembro } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, jugador_id, rol')
    .eq('id', miembro_id)
    .maybeSingle();

  if (!miembro) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });

  const esSalida = miembro.jugador_id === user.id;

  // --- Validaciones de salida voluntaria ---
  if (esSalida) {
    // Admin no puede salir — debe disolver el equipo
    if (miembro.rol === 'admin') {
      return NextResponse.json(
        { error: 'El administrador no puede abandonar el equipo. Usa "Disolver equipo" si deseas cerrarlo.' },
        { status: 403 },
      );
    }

    // Bloqueo por temporada activa
    const { data: equipo } = await supabase
      .from('equipos')
      .select('temporada_id, deporte')
      .eq('id', miembro.equipo_id)
      .maybeSingle();

    if (equipo?.temporada_id) {
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
          { error: 'No puedes salir del equipo mientras la temporada está en curso.' },
          { status: 403 },
        );
      }
    }
  } else {
    // Expulsión — verificar que el caller es admin/capitán del mismo equipo
    const { data: miAdmin } = await supabase
      .from('equipo_miembros')
      .select('rol')
      .eq('equipo_id', miembro.equipo_id)
      .eq('jugador_id', user.id)
      .in('rol', ['admin', 'capitan'])
      .maybeSingle();

    if (!miAdmin) {
      return NextResponse.json({ error: 'Sin permisos para expulsar miembros' }, { status: 403 });
    }

    // No se puede expulsar al admin del equipo
    if (miembro.rol === 'admin') {
      return NextResponse.json(
        { error: 'No puedes expulsar al administrador del equipo.' },
        { status: 403 },
      );
    }
  }

  const { error } = await supabase
    .from('equipo_miembros')
    .delete()
    .eq('id', miembro_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
