import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('canchas')
    .select('*, cancha_dominio(*, equipos(id, nombre, color))')
    .eq('id', id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Cancha no encontrada' }, { status: 404 });

  return Response.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const {
    nombre, direccion, lat, lng, deporte,
    // optional recinto fields (migration 023)
    es_publica, precio_hora, telefono_contacto, nombre_recinto,
    // region/comuna (migration 039)
    region, comuna,
  } = body;

  if (!nombre?.trim() || !direccion?.trim() || typeof lat !== 'number' || typeof lng !== 'number' || !Array.isArray(deporte) || deporte.length === 0) {
    return Response.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
  }

  // Range and content validation
  if (nombre.trim().length > 120) {
    return Response.json({ error: 'nombre demasiado largo (máx 120 caracteres)' }, { status: 400 });
  }
  if (direccion.trim().length > 250) {
    return Response.json({ error: 'direccion demasiado larga (máx 250 caracteres)' }, { status: 400 });
  }
  if (lat < -90 || lat > 90) {
    return Response.json({ error: 'lat fuera de rango (-90 a 90)' }, { status: 400 });
  }
  if (lng < -180 || lng > 180) {
    return Response.json({ error: 'lng fuera de rango (-180 a 180)' }, { status: 400 });
  }
  const DEPORTES_VALIDOS = ['basketball']; // MVP: solo basketball
  if (!deporte.every((d: unknown) => typeof d === 'string' && DEPORTES_VALIDOS.includes(d))) {
    return Response.json({ error: 'deporte contiene valores inválidos' }, { status: 400 });
  }
  // Recinto fields validation
  if (precio_hora !== undefined && precio_hora !== null) {
    if (typeof precio_hora !== 'number' || !Number.isInteger(precio_hora) || precio_hora < 0 || precio_hora > 10_000_000) {
      return Response.json({ error: 'precio_hora inválido' }, { status: 400 });
    }
  }
  if (telefono_contacto !== undefined && telefono_contacto !== null) {
    if (typeof telefono_contacto !== 'string' || telefono_contacto.length > 50) {
      return Response.json({ error: 'telefono_contacto inválido (máx 50 caracteres)' }, { status: 400 });
    }
  }
  if (nombre_recinto !== undefined && nombre_recinto !== null) {
    if (typeof nombre_recinto !== 'string' || nombre_recinto.length > 120) {
      return Response.json({ error: 'nombre_recinto inválido (máx 120 caracteres)' }, { status: 400 });
    }
  }
  if (region !== undefined && region !== null) {
    if (typeof region !== 'string' || region.trim().length === 0 || region.length > 100) {
      return Response.json({ error: 'region inválida (máx 100 caracteres)' }, { status: 400 });
    }
  }
  if (comuna !== undefined && comuna !== null) {
    if (typeof comuna !== 'string' || comuna.trim().length === 0 || comuna.length > 100) {
      return Response.json({ error: 'comuna inválida (máx 100 caracteres)' }, { status: 400 });
    }
  }

  // [S-1] Verify ownership before updating — any authenticated user could
  // otherwise edit coordinates/name of any cancha (vandalism attack).
  const { data: canchaExistente } = await supabase
    .from('canchas')
    .select('agregada_por')
    .eq('id', id)
    .maybeSingle();

  if (!canchaExistente) {
    return Response.json({ error: 'Cancha no encontrada' }, { status: 404 });
  }
  if (canchaExistente.agregada_por !== user.id) {
    return Response.json({ error: 'Solo quien agregó esta cancha puede editarla' }, { status: 403 });
  }

  // Build update payload — only include recinto fields if provided
  const updatePayload: Record<string, unknown> = {
    nombre: nombre.trim(),
    direccion: direccion.trim(),
    lat,
    lng,
    deporte,
  };
  if (typeof es_publica === 'boolean')          updatePayload.es_publica = es_publica;
  if (precio_hora !== undefined)                updatePayload.precio_hora = precio_hora ?? null;
  if (telefono_contacto !== undefined)          updatePayload.telefono_contacto = telefono_contacto ?? null;
  if (nombre_recinto !== undefined)             updatePayload.nombre_recinto = nombre_recinto ?? null;
  if (region !== undefined)                     updatePayload.region = region ?? null;
  if (comuna !== undefined)                     updatePayload.comuna = comuna ?? null;

  const { data, error } = await supabase
    .from('canchas')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No se pudo actualizar la cancha' }, { status: 500 });

  return Response.json({ cancha: data });
}
