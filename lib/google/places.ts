import 'server-only';

/**
 * Cliente de Google Places API (New) — solo server.
 *
 * El import de `server-only` hace que el build falle si alguien importa este
 * módulo desde un componente cliente: la API key no puede llegar al browser.
 * Es una key distinta de `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (esa está
 * restringida por HTTP referrer y solo sirve para el mapa del front).
 *
 * Costos: se pide el FieldMask mínimo (id, nombre, ubicación, dirección), que
 * cae en el tier barato de Nearby Search. No se usa Place Details en ningún
 * momento — el place id alcanza como referencia externa.
 */

const NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby';

/** Solo lo que KOC necesita. Pedir más campos sube el tier de precio. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
].join(',');

/** Tipo de lugar de Google que corresponde a una cancha de basketball. */
const TIPOS_BASKETBALL = ['sports_complex', 'park'];

/** Google tope la respuesta en 20 resultados por llamada. */
const MAX_RESULTS = 20;

const TIMEOUT_MS = 10_000;

export interface LugarGoogle {
  placeId: string;
  nombre: string;
  lat: number;
  lng: number;
  direccion: string | null;
}

export interface BusquedaCercana {
  lat: number;
  lng: number;
  radioM: number;
}

/** Falla esperable de Google (cuota, key inválida, timeout): no es un bug nuestro. */
export class GooglePlacesError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'GooglePlacesError';
  }
}

interface RespuestaPlaces {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    formattedAddress?: string;
  }>;
}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new GooglePlacesError(
      'Falta GOOGLE_MAPS_API_KEY (server-only). Ver docs/GOOGLE_PLACES_IMPORT.md',
    );
  }
  return key;
}

/**
 * Busca lugares deportivos alrededor de un punto.
 *
 * Devuelve solo lo que se va a usar: si Google manda un resultado sin id o sin
 * coordenadas, se descarta acá en vez de arrastrar un registro a medias.
 */
export async function buscarCanchasCercanas({ lat, lng, radioM }: BusquedaCercana): Promise<LugarGoogle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(NEARBY_SEARCH_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey(),
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: TIPOS_BASKETBALL,
        maxResultCount: MAX_RESULTS,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radioM,
          },
        },
      }),
      // Una importación tiene que ver el estado real, no una respuesta cacheada.
      cache: 'no-store',
    });
  } catch (err) {
    if (err instanceof GooglePlacesError) throw err;
    const esTimeout = err instanceof Error && err.name === 'AbortError';
    throw new GooglePlacesError(
      esTimeout ? 'Google Places no respondió a tiempo' : 'No se pudo contactar a Google Places',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // El cuerpo del error de Google puede traer la key en el mensaje: no se
    // propaga tal cual al cliente, solo el código.
    throw new GooglePlacesError(`Google Places respondió ${res.status}`, res.status);
  }

  const data = (await res.json()) as RespuestaPlaces;

  return (data.places ?? []).flatMap((p) => {
    const placeId = p.id;
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!placeId || typeof lat !== 'number' || typeof lng !== 'number') return [];
    return [{
      placeId,
      nombre: p.displayName?.text?.trim() || 'Cancha sin nombre',
      lat,
      lng,
      direccion: p.formattedAddress?.trim() || null,
    }];
  });
}
