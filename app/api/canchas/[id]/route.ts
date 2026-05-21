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
  const { nombre, direccion, lat, lng, deporte } = body;

  if (!nombre?.trim() || !direccion?.trim() || typeof lat !== 'number' || typeof lng !== 'number' || !Array.isArray(deporte) || deporte.length === 0) {
    return Response.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('canchas')
    .update({ nombre: nombre.trim(), direccion: direccion.trim(), lat, lng, deporte })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No se pudo actualizar la cancha (sin permiso o no existe)' }, { status: 403 });

  return Response.json({ cancha: data });
}
