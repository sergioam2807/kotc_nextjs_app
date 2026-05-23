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
    es_publica, precio_hora, telefono_contacto, nombre_recinto,
  } = body;

  if (!nombre?.trim() || !direccion?.trim() || typeof lat !== 'number' || typeof lng !== 'number' || !Array.isArray(deporte) || deporte.length === 0) {
    return Response.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    nombre: nombre.trim(),
    direccion: direccion.trim(),
    lat,
    lng,
    deporte,
  };

  // Optional info fields — only update if present in the request body
  if (typeof es_publica === 'boolean')      updatePayload.es_publica         = es_publica;
  if (precio_hora     !== undefined)        updatePayload.precio_hora         = precio_hora ?? null;
  if (telefono_contacto !== undefined)      updatePayload.telefono_contacto   = telefono_contacto?.trim() ?? null;
  if (nombre_recinto    !== undefined)      updatePayload.nombre_recinto      = nombre_recinto?.trim()    ?? null;

  const { data, error } = await supabase
    .from('canchas')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No se pudo actualizar la cancha (sin permiso o no existe)' }, { status: 403 });

  return Response.json({ cancha: data });
}
