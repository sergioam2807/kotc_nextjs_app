import type { LugarGoogle } from '@/lib/google/places';

/**
 * Convierte resultados de Google en candidatos de KOC.
 *
 * Está escrito contra un puerto (`PuertoCanchas`) y recibe el buscador como
 * dependencia: así se puede probar la deduplicación entera sin Supabase y sin
 * pegarle a Google. La implementación real contra Supabase vive en la route
 * administrativa, que es la única que tiene sesión y permisos.
 */

/** Distancia bajo la cual dos puntos se consideran la misma cancha. */
export const DISTANCIA_MISMA_CANCHA_M = 40;

export interface CanchaExistente {
  id: string;
  lat: number;
  lng: number;
  google_place_id: string | null;
}

export interface CanchaNueva {
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  google_place_id: string;
}

export interface PuertoCanchas {
  /** Canchas ya guardadas dentro del área de búsqueda (para dedupe por cercanía). */
  canchasEnArea(lat: number, lng: number, radioM: number): Promise<CanchaExistente[]>;
  /**
   * Inserta ignorando conflictos de `google_place_id`. Devuelve cuántas filas
   * entraron de verdad: si otra importación simultánea ya insertó una, el
   * índice único la rebota y acá se cuenta como duplicada, no como error.
   */
  insertarPendientes(canchas: CanchaNueva[]): Promise<number>;
  /**
   * Anota el place id en una cancha que ya existía sin él (típicamente venida
   * del import de OpenStreetMap). No toca ningún otro campo: no es sobreescribir
   * datos de KOC, es agregarle la referencia externa que le faltaba para que la
   * próxima corrida la deduplique por id y no por distancia.
   */
  vincularPlaceId(canchaId: string, placeId: string): Promise<void>;
}

export interface EstadisticasDiscovery {
  found: number;
  created: number;
  duplicated: number;
  errors: number;
}

export interface OpcionesDiscovery {
  lat: number;
  lng: number;
  radioM: number;
  buscar: (args: { lat: number; lng: number; radioM: number }) => Promise<LugarGoogle[]>;
  puerto: PuertoCanchas;
}

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Descubre canchas en un área y crea como PENDING solo las que no existían.
 *
 * Tres capas de deduplicación, de más barata a más cara:
 *   1. dentro de la respuesta de Google (puede repetir un place id),
 *   2. contra los `google_place_id` ya guardados,
 *   3. por cercanía contra las canchas que ya hay en la zona — necesaria porque
 *      el import de OpenStreetMap ya pobló canchas que Google también conoce,
 *      y sin esto volverían a entrar todas como PENDING.
 */
export async function descubrirCanchas({
  lat,
  lng,
  radioM,
  buscar,
  puerto,
}: OpcionesDiscovery): Promise<EstadisticasDiscovery> {
  const lugares = await buscar({ lat, lng, radioM });
  const found = lugares.length;

  // [1] Google puede devolver el mismo place id más de una vez.
  const unicos = new Map<string, LugarGoogle>();
  for (const lugar of lugares) {
    if (!unicos.has(lugar.placeId)) unicos.set(lugar.placeId, lugar);
  }
  let duplicated = found - unicos.size;

  const existentes = await puerto.canchasEnArea(lat, lng, radioM);
  const porPlaceId = new Set(
    existentes.map((c) => c.google_place_id).filter((id): id is string => !!id),
  );
  const sinPlaceId = existentes.filter((c) => !c.google_place_id);

  const nuevas: CanchaNueva[] = [];
  let errors = 0;

  for (const lugar of unicos.values()) {
    // [2] Ya conocemos este place id.
    if (porPlaceId.has(lugar.placeId)) {
      duplicated++;
      continue;
    }

    // [3] Hay una cancha nuestra prácticamente en el mismo punto.
    const cercana = sinPlaceId.find(
      (c) => distanciaMetros(c.lat, c.lng, lugar.lat, lugar.lng) < DISTANCIA_MISMA_CANCHA_M,
    );
    if (cercana) {
      duplicated++;
      try {
        await puerto.vincularPlaceId(cercana.id, lugar.placeId);
        // Se saca de la lista para que dos resultados de Google no se vinculen
        // a la misma cancha.
        sinPlaceId.splice(sinPlaceId.indexOf(cercana), 1);
        porPlaceId.add(lugar.placeId);
      } catch {
        // Vincular es una mejora, no el objetivo: si falla, la cancha sigue
        // estando bien deduplicada por cercanía en esta corrida.
        errors++;
      }
      continue;
    }

    nuevas.push({
      nombre: lugar.nombre,
      direccion: lugar.direccion ?? 'Sin dirección',
      lat: lugar.lat,
      lng: lugar.lng,
      google_place_id: lugar.placeId,
    });
  }

  let created = 0;
  if (nuevas.length > 0) {
    created = await puerto.insertarPendientes(nuevas);
    // Lo que el índice único rebotó fue una carrera contra otra importación.
    duplicated += nuevas.length - created;
  }

  return { found, created, duplicated, errors };
}
