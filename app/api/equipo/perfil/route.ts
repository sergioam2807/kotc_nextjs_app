import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MODALIDADES_RIVAL_VALIDAS = ['1v1','2v2','3v3','4v4','5v5','equipo_completo'] as const;
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Verify admin role on caller's team
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .eq('rol', 'admin')
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    return NextResponse.json({ error: 'No eres administrador de ningún equipo' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // ── Perfil básico del equipo ──────────────────────────────────────────────
  if ('nombre' in body) {
    const nombre = body.nombre;
    if (typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });
    }
    if (nombre.trim().length > 50) {
      return NextResponse.json({ error: 'nombre demasiado largo (máx. 50 caracteres)' }, { status: 400 });
    }
    updates.nombre = nombre.trim();
  }

  if ('color' in body) {
    const color = body.color;
    if (typeof color !== 'string' || !COLOR_RE.test(color)) {
      return NextResponse.json({ error: 'color inválido (debe ser hex: #RGB o #RRGGBB)' }, { status: 400 });
    }
    updates.color = color;
  }

  if ('ciudad' in body) {
    const ciudad = body.ciudad;
    if (ciudad !== null && ciudad !== undefined) {
      if (typeof ciudad !== 'string' || ciudad.trim().length > 60) {
        return NextResponse.json({ error: 'ciudad inválida (máx. 60 caracteres)' }, { status: 400 });
      }
      updates.ciudad = ciudad.trim() || null;
    } else {
      updates.ciudad = null;
    }
  }

  if ('region' in body) {
    const region = body.region;
    updates.region = (typeof region === 'string' && region.trim()) ? region.trim() : null;
  }

  if ('comuna' in body) {
    const comuna = body.comuna;
    updates.comuna = (typeof comuna === 'string' && comuna.trim()) ? comuna.trim() : null;
  }

  if ('descripcion' in body) {
    const desc = body.descripcion;
    if (desc !== null && desc !== undefined) {
      if (typeof desc !== 'string' || desc.length > 500) {
        return NextResponse.json({ error: 'descripcion demasiado larga (máx. 500 caracteres)' }, { status: 400 });
      }
      updates.descripcion = desc.trim() || null;
    } else {
      updates.descripcion = null;
    }
  }

  // ── Buscando rival ────────────────────────────────────────────────────────
  if (typeof body.buscando_rival === 'boolean') {
    updates.buscando_rival = body.buscando_rival;
    if (!body.buscando_rival) updates.rival_modalidad = null;
  }

  if ('rival_modalidad' in body) {
    const mod = body.rival_modalidad;
    if (mod !== null && !(MODALIDADES_RIVAL_VALIDAS as readonly string[]).includes(mod)) {
      return NextResponse.json({ error: 'rival_modalidad inválida' }, { status: 400 });
    }
    updates.rival_modalidad = mod ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('equipos')
    .update(updates)
    .eq('id', membresia.equipo_id)
    .select('id, nombre, color, ciudad, region, comuna, descripcion, buscando_rival, rival_modalidad')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
