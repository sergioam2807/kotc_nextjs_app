import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buscarCanchasCercanas, GooglePlacesError } from '@/lib/google/places';
import { descubrirCanchas, type CanchaNueva, type PuertoCanchas } from '@/lib/canchas/discovery';
import {
  validarEntradaImport,
  superaLimiteDeImports,
  LIMITE_IMPORTS,
  VENTANA_IMPORTS_MIN,
} from '@/lib/canchas/moderacion';

/** Mismo guard que el resto del admin: ADMIN_EMAIL es server-only. */
function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

/** Grados de latitud por metro; suficiente para acotar la consulta del área. */
const GRADOS_POR_METRO = 1 / 111_320;

/**
 * POST /api/admin/canchas/importar
 *
 * Descubre canchas con Google Places y crea como PENDING las que no existían.
 * Es una acción administrativa deliberada: no hay ningún camino automático que
 * la dispare.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const validacion = validarEntradaImport(body);
  if (!validacion.ok) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }
  const { lat, lng, radioM, zona } = validacion.valor;

  // ── Límite de frecuencia sobre el historial ───────────────────────────────
  const desde = new Date(Date.now() - VENTANA_IMPORTS_MIN * 60_000).toISOString();
  const { data: recientes } = await supabase
    .from('cancha_discovery_runs')
    .select('started_at')
    .eq('ejecutado_por', user.id)
    .gte('started_at', desde);

  if (superaLimiteDeImports((recientes ?? []).map((r) => r.started_at))) {
    return NextResponse.json(
      { error: `Máximo ${LIMITE_IMPORTS} importaciones cada ${VENTANA_IMPORTS_MIN} minutos` },
      { status: 429 },
    );
  }

  // ── Registro de la corrida (auditoría + base del límite de arriba) ────────
  const { data: run, error: runError } = await supabase
    .from('cancha_discovery_runs')
    .insert({ ejecutado_por: user.id, zona, lat, lng, radio_m: radioM })
    .select('id')
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: 'No se pudo registrar la importación' }, { status: 500 });
  }

  // ── Puerto contra Supabase ────────────────────────────────────────────────
  const puerto: PuertoCanchas = {
    async canchasEnArea(lat, lng, radioM) {
      // Caja alrededor del punto: PostgREST no hace distancias, y afinar con
      // haversine en memoria sobre unas pocas filas sale más barato que sumar
      // PostGIS solo para esto.
      const dLat = radioM * GRADOS_POR_METRO;
      const dLng = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
      const { data } = await supabase
        .from('canchas')
        .select('id, lat, lng, google_place_id')
        .gte('lat', lat - dLat).lte('lat', lat + dLat)
        .gte('lng', lng - dLng).lte('lng', lng + dLng)
        .limit(1000);
      return data ?? [];
    },

    async insertarPendientes(canchas: CanchaNueva[]) {
      const filas = canchas.map((c) => ({
        ...c,
        deporte: ['basketball'],
        agregada_por: user.id,
        status: 'pending',
        validada: false,
      }));
      // ignoreDuplicates deja que el índice único resuelva la carrera contra
      // otra importación simultánea: devuelve solo lo que entró de verdad.
      const { data, error } = await supabase
        .from('canchas')
        .upsert(filas, { onConflict: 'google_place_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },

    async vincularPlaceId(canchaId, placeId) {
      // Solo si sigue sin place id: nunca pisa una referencia ya existente.
      const { error } = await supabase
        .from('canchas')
        .update({ google_place_id: placeId })
        .eq('id', canchaId)
        .is('google_place_id', null);
      if (error) throw new Error(error.message);
    },
  };

  try {
    const stats = await descubrirCanchas({ lat, lng, radioM, buscar: buscarCanchasCercanas, puerto });

    await supabase
      .from('cancha_discovery_runs')
      .update({ finished_at: new Date().toISOString(), ...stats })
      .eq('id', run.id);

    return NextResponse.json({ runId: run.id, ...stats });
  } catch (err) {
    const esGoogle = err instanceof GooglePlacesError;
    const detalle = err instanceof Error ? err.message : 'Error desconocido';

    await supabase
      .from('cancha_discovery_runs')
      .update({ finished_at: new Date().toISOString(), errors: 1, error_detail: detalle })
      .eq('id', run.id);

    return NextResponse.json(
      { error: esGoogle ? detalle : 'No se pudo completar la importación' },
      { status: esGoogle ? 502 : 500 },
    );
  }
}
