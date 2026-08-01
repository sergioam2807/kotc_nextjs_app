/**
 * KOTC — Import masivo de canchas desde OpenStreetMap (Overpass API)
 *
 * Estrategia:
 *   1. Overpass API  — fuente principal (gratis, sin API key, ~80% cobertura en Chile)
 *   2. Nominatim     — geocodificación inversa para completar direcciones (gratis, 1 req/s)
 *   3. Supabase      — inserción final con service_role (bypass RLS)
 *
 * Uso:
 *   pnpm import:canchas:dry    ← preview sin insertar (usa npx tsx internamente)
 *   pnpm import:canchas        ← import real
 *
 *   O directamente:
 *   npx tsx scripts/import-canchas-osm.ts --dry-run
 *
 *   Para instalar tsx de forma permanente: pnpm add -D tsx
 *
 * El script carga .env.local automáticamente (no requiere dotenv instalado).
 *
 * Opciones:
 *   --ciudad=santiago | vinaDelMar | valparaiso | todas  (default: todas)
 *   --deportes=basketball,futbol,tenis,voleibol,padel    (default: todos)
 *   --dry-run          Ver resultados sin insertar en DB
 *   --verbose          Log detallado de cada cancha
 *   --skip-geocoding   No usar Nominatim (más rápido, sin dirección textual)
 *
 * Ejemplos:
 *   npx tsx --env-file=.env.local scripts/import-canchas-osm.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/import-canchas-osm.ts --ciudad=santiago --deportes=basketball
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   ← agregar solo para scripts (no usar en frontend)
 *   IMPORT_ADMIN_USER_ID=...        ← UUID del admin, obligatorio (canchas.agregada_por es NOT NULL)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

// Carga .env.local sin necesitar dotenv como dependencia
(function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local no encontrado — se asume que las vars ya están en el entorno */ }
})();

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Ciudad {
  label:   string;
  region:  string;
  /** [south, west, north, east] */
  bbox:    [number, number, number, number];
  comunas: string[];
}

interface OsmElement {
  type:   'node' | 'way' | 'relation';
  id:     number;
  lat?:   number;
  lon?:   number;
  center?: { lat: number; lon: number };
  tags?:  Record<string, string>;
}

interface OsmResult {
  elements: OsmElement[];
}

interface CanchaParaInsertar {
  nombre:            string;
  direccion:         string;
  lat:               number;
  lng:               number;
  deporte:           string[];
  es_publica:        boolean;
  precio_hora:       null;
  telefono_contacto: string | null;
  nombre_recinto:    string | null;
  superficie:        string | null;
  iluminacion:       boolean | null;
  region:            string;
  comuna:            string | null;
  osm_id:            number;
  osm_type:          string;
  agregada_por:      string | null;
}

// ── Configuración de ciudades ──────────────────────────────────────────────────

const CIUDADES: Record<string, Ciudad> = {
  santiago: {
    label:  'Gran Santiago',
    region: 'Región Metropolitana',
    bbox:   [-33.72, -70.88, -33.27, -70.48],
    comunas: [
      'Santiago', 'Providencia', 'Las Condes', 'Maipú', 'La Florida',
      'San Bernardo', 'Pudahuel', 'Peñalolén', 'La Pintana', 'Quilicura',
      'Puente Alto', 'Ñuñoa', 'Recoleta', 'Independencia', 'San Miguel',
      'Macul', 'Cerrillos', 'Lo Espejo', 'Pedro Aguirre Cerda', 'Renca',
      'Conchalí', 'Vitacura', 'Lo Barnechea', 'Huechuraba', 'Colina',
      'Lampa', 'El Bosque', 'La Granja', 'La Cisterna', 'San Ramón',
    ],
  },
  vinaDelMar: {
    label:  'Viña del Mar',
    region: 'Región de Valparaíso',
    bbox:   [-33.10, -71.60, -33.00, -71.48],
    comunas: ['Viña del Mar', 'Concón'],
  },
  valparaiso: {
    label:  'Valparaíso',
    region: 'Región de Valparaíso',
    bbox:   [-33.08, -71.72, -32.98, -71.58],
    comunas: ['Valparaíso'],
  },
};

// ── Mapeo OSM → KOTC ──────────────────────────────────────────────────────────

/** OSM `sport` tag → KOTC `deporte` value */
const SPORT_MAP: Record<string, string> = {
  basketball:        'basketball',
  soccer:            'futbol',
  football:          'futbol',
  futsal:            'futbol',
  'american_football': 'futbol',
  volleyball:        'voleibol',
  beach_volleyball:  'voleibol',
  tennis:            'tenis',
  padel:             'padel',
  paddle_tennis:     'padel',
};

/** OSM `surface` → KOTC `superficie` */
const SURFACE_MAP: Record<string, string> = {
  asphalt:       'asfalto',
  concrete:      'cemento',
  paved:         'cemento',
  wood:          'madera',
  artificial_turf: 'sintetico',
  grass:         'otro',
  gravel:        'otro',
  sand:          'otro',
  tartan:        'otro',
  rubber:        'otro',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Haversine distance in meters between two lat/lng pairs */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse CLI args as --key=value or --flag */
function parseArgs(argv: string[]) {
  const result: Record<string, string | boolean> = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value ?? true;
    }
  }
  return result;
}

// ── Overpass API ──────────────────────────────────────────────────────────────

// Múltiples endpoints — si el primero falla se intenta el siguiente
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function buildOverpassQuery(bbox: [number, number, number, number], sports: string[]): string {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;
  const osmSports = Object.keys(SPORT_MAP).filter(k => sports.includes(SPORT_MAP[k]));
  const sportRegex = osmSports.join('|');

  // Query for pitches + sports centres (may have multiple sports)
  return `
[out:json][timeout:120];
(
  node["leisure"="pitch"]["sport"~"^(${sportRegex})$"](${bboxStr});
  way["leisure"="pitch"]["sport"~"^(${sportRegex})$"](${bboxStr});
  node["leisure"="sports_centre"]["sport"~"^(${sportRegex})$"](${bboxStr});
  way["leisure"="sports_centre"]["sport"~"^(${sportRegex})$"](${bboxStr});
  node["sport"~"^(${sportRegex})$"]["leisure"!~"."](${bboxStr});
  way["sport"~"^(${sportRegex})$"]["leisure"!~"."](${bboxStr});
);
out center tags;
`.trim();
}

async function fetchOverpass(query: string): Promise<OsmElement[]> {
  let lastError: Error = new Error('Sin endpoints disponibles');

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      // Intentar con POST + form-urlencoded
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':   'KOTC-import/1.0 (kotc.cl; contacto@kotc.cl)',
          'Accept':       'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} desde ${endpoint}`);
        console.warn(`  ⚠️  ${endpoint} → ${res.status}, probando siguiente…`);
        continue;
      }

      const json = await res.json() as OsmResult;
      console.log(`  ✓ Respuesta desde: ${endpoint}`);
      return json.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`  ⚠️  Error en ${endpoint}: ${lastError.message}, probando siguiente…`);
    }

    await sleep(2000);
  }

  throw lastError;
}

// ── Nominatim (geocodificación inversa) ───────────────────────────────────────

interface NominatimResult {
  display_name: string;
  address: {
    road?:        string;
    house_number?: string;
    suburb?:      string;
    city?:        string;
    town?:        string;
    village?:     string;
    municipality?: string;
    county?:      string;
    state?:       string;
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<{ direccion: string; comuna: string | null }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`;
  const fallback = { direccion: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, comuna: null };

  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      headers: { 'User-Agent': 'KOTC-import/1.0 (kotc.cl)' },
    });
    if (res.status !== 429) break;
    if (attempt >= 3) return fallback;
    const backoffMs = 5000 * (attempt + 1);
    console.warn(`  ⚠️  Nominatim 429 (rate limited) — esperando ${backoffMs / 1000}s…`);
    await sleep(backoffMs);
  }
  if (!res.ok) return fallback;

  const data = await res.json() as NominatimResult;
  const a = data.address;
  const parts: string[] = [];
  if (a.road)         parts.push(a.road);
  if (a.house_number) parts.push(`#${a.house_number}`);
  const comunaRaw = a.city ?? a.town ?? a.village ?? a.suburb ?? a.municipality ?? null;
  if (comunaRaw)      parts.push(comunaRaw);
  return {
    direccion: parts.join(', ') || data.display_name,
    comuna:    comunaRaw,
  };
}

// ── Parsing de elementos OSM ──────────────────────────────────────────────────

function getCoords(el: OsmElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center)                        return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function getDeporte(tags: Record<string, string>): string[] {
  const sports = new Set<string>();
  // tags.sport can be "basketball;tennis" (multiple)
  const sportValues = (tags.sport ?? '').split(/[;,]/).map(s => s.trim().toLowerCase());
  for (const s of sportValues) {
    const mapped = SPORT_MAP[s];
    if (mapped) sports.add(mapped);
  }
  return Array.from(sports);
}

function getSuperficie(tags: Record<string, string>): string | null {
  const surface = tags.surface?.toLowerCase();
  if (!surface) return null;
  if (tags.indoor === 'yes' || tags.covered === 'yes') return 'interior';
  return SURFACE_MAP[surface] ?? null;
}

function getIluminacion(tags: Record<string, string>): boolean | null {
  if (tags.lit === 'yes')  return true;
  if (tags.lit === 'no')   return false;
  return null;
}

function getNombre(tags: Record<string, string>, deporte: string[], ciudad: Ciudad): string {
  // Prefer Spanish name, then generic name
  const name = tags['name:es'] ?? tags.name;
  if (name && name.length > 1) return name;

  // Fallback: build a descriptive name
  const deporteLabel = deporte.map(d => {
    if (d === 'basketball') return 'Basketball';
    if (d === 'futbol')     return 'Fútbol';
    if (d === 'voleibol')   return 'Voleibol';
    if (d === 'tenis')      return 'Tenis';
    if (d === 'padel')      return 'Pádel';
    return d;
  }).join('/');

  const recinto = tags.operator ?? tags.brand ?? tags['addr:suburb'] ?? '';
  return recinto ? `Cancha ${deporteLabel} — ${recinto}` : `Cancha de ${deporteLabel}`;
}

function getDireccionDeOSM(tags: Record<string, string>): string | null {
  const parts: string[] = [];
  if (tags['addr:street'])      parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(`#${tags['addr:housenumber']}`);
  if (tags['addr:city'])        parts.push(tags['addr:city']);
  return parts.length > 0 ? parts.join(', ') : null;
}

function getEsPublica(tags: Record<string, string>): boolean {
  const access = tags.access?.toLowerCase();
  if (access === 'private' || access === 'customers' || access === 'no') return false;
  return true;
}

// ── Deduplicación ─────────────────────────────────────────────────────────────

/**
 * Merge courts that are very close together (< 30m) into one entry,
 * combining their sport arrays. This handles sports centres that OSM
 * tags as separate nodes per sport.
 */
function deduplicarPorProximidad(canchas: CanchaParaInsertar[]): CanchaParaInsertar[] {
  const MERGE_DISTANCE_M = 30;
  const result: CanchaParaInsertar[] = [];

  for (const cancha of canchas) {
    const nearby = result.find(r =>
      haversineMeters(r.lat, r.lng, cancha.lat, cancha.lng) < MERGE_DISTANCE_M
    );
    if (nearby) {
      // Merge sports arrays
      for (const d of cancha.deporte) {
        if (!nearby.deporte.includes(d)) nearby.deporte.push(d);
      }
      // Keep better name (longer = more descriptive)
      if (cancha.nombre.length > nearby.nombre.length) nearby.nombre = cancha.nombre;
    } else {
      result.push({ ...cancha });
    }
  }
  return result;
}

// ── Backfill de direcciones ──────────────────────────────────────────────────

/**
 * Re-geocodifica canchas cuya `direccion` quedó como placeholder "lat, lng"
 * (típicamente porque Nominatim estaba rate-limited durante el import).
 * No vuelve a consultar Overpass ni inserta filas nuevas — solo hace UPDATE
 * de `direccion` y `comuna` para las filas ya existentes.
 */
const COORD_FALLBACK_RE = /^-?\d+\.\d{4,}, -?\d+\.\d{4,}$/;

async function backfillDirecciones(supabase: ReturnType<typeof createClient>) {
  console.log('🔍 Buscando canchas con dirección placeholder (lat, lng)…\n');

  const { data: candidatas, error } = await supabase
    .from('canchas')
    .select('id, direccion, lat, lng')
    .not('osm_id', 'is', null);

  if (error) {
    console.error(`❌ Error consultando canchas: ${error.message}`);
    process.exit(1);
  }

  const pendientes = (candidatas ?? []).filter(c => COORD_FALLBACK_RE.test(c.direccion ?? ''));
  console.log(`   → ${pendientes.length} canchas por re-geocodificar\n`);

  let actualizadas = 0;
  let siguenFallando = 0;

  for (const c of pendientes) {
    await sleep(1500);
    const geo = await reverseGeocode(c.lat, c.lng);

    if (COORD_FALLBACK_RE.test(geo.direccion)) {
      siguenFallando++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('canchas')
      .update({ direccion: geo.direccion, comuna: geo.comuna })
      .eq('id', c.id);

    if (updateError) {
      console.error(`  ❌ [${c.id}] ${updateError.message}`);
      continue;
    }

    actualizadas++;
    process.stdout.write(`  ✅ ${actualizadas}/${pendientes.length} actualizadas\r`);
  }

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`✅ BACKFILL COMPLETADO`);
  console.log(`   Actualizadas   : ${actualizadas}`);
  if (siguenFallando > 0) console.log(`   Sin resolver   : ${siguenFallando} (Nominatim siguió sin devolver dirección — reintentar más tarde)`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // ── Opciones CLI
  const ciudadArg     = (args.ciudad  as string) ?? 'todas';
  const deportesArg   = (args.deportes as string) ?? 'basketball,futbol,tenis,voleibol,padel';
  const dryRun        = args['dry-run'] === true;
  const verbose       = args.verbose === true;
  const skipGeocode   = args['skip-geocoding'] === true;
  const backfill      = args['backfill-direcciones'] === true;

  const deportesFiltro = deportesArg.split(',').map(s => s.trim());
  const ciudadesAImportar = ciudadArg === 'todas'
    ? Object.entries(CIUDADES)
    : Object.entries(CIUDADES).filter(([k]) => k === ciudadArg);

  if (ciudadesAImportar.length === 0) {
    console.error(`❌  Ciudad desconocida: "${ciudadArg}". Usa: ${Object.keys(CIUDADES).join(' | ')} | todas`);
    process.exit(1);
  }

  // ── Supabase client (service_role para bypass RLS en scripts)
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserId    = process.env.IMPORT_ADMIN_USER_ID ?? null;

  // En dry-run no se necesita Supabase — solo consultamos Overpass
  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    console.error(`
❌  Faltan variables de entorno en .env.local para el import real:
    NEXT_PUBLIC_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...   ← Supabase Dashboard > Settings > API > service_role
    IMPORT_ADMIN_USER_ID=...        ← UUID del admin (obligatorio: canchas.agregada_por es NOT NULL)
    `);
    process.exit(1);
  }

  // Cliente Supabase — disponible para los pasos de lectura/escritura en DB
  const supabase = (supabaseUrl && serviceRoleKey)
    ? createClient(supabaseUrl, serviceRoleKey, { realtime: { transport: WebSocket } })
    : null;

  if (backfill) {
    if (!supabase) {
      console.error('❌ Backfill requiere SUPABASE_SERVICE_ROLE_KEY en .env.local');
      process.exit(1);
    }
    await backfillDirecciones(supabase);
    return;
  }

  // ── Obtener OSM IDs ya existentes en DB para no duplicar (solo en import real)
  const osmExistentes = new Set<string>();
  if (!dryRun && supabase) {
    console.log('📡 Obteniendo canchas OSM ya importadas…');
    const { data: existentes } = await supabase
      .from('canchas')
      .select('osm_id, osm_type')
      .not('osm_id', 'is', null);
    for (const c of existentes ?? []) osmExistentes.add(`${c.osm_type}:${c.osm_id}`);
    console.log(`   → ${osmExistentes.size} canchas con OSM ID ya en DB (se saltarán)\n`);
  } else if (dryRun) {
    console.log('ℹ️  Dry-run: se omite verificación de duplicados en DB\n');
  }

  // ── Resultado global
  const todasLasCanchas: CanchaParaInsertar[] = [];
  let totalEncontradas = 0;
  let totalSaltadas    = 0;

  // ── Por ciudad
  for (const [ciudadKey, ciudad] of ciudadesAImportar) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🗺️  ${ciudad.label}  [${ciudadKey}]`);
    console.log(`   BBox: ${ciudad.bbox.join(', ')}`);
    console.log(`   Deportes: ${deportesFiltro.join(', ')}`);
    console.log(`${'─'.repeat(60)}`);

    // Fetch Overpass
    console.log('📡 Consultando Overpass API…');
    const query = buildOverpassQuery(ciudad.bbox, deportesFiltro);

    let elementos: OsmElement[];
    try {
      elementos = await fetchOverpass(query);
    } catch (err) {
      console.error(`❌  Error Overpass: ${err}`);
      continue;
    }
    console.log(`   → ${elementos.length} elementos OSM recibidos`);

    // Parsear
    const canchasCiudad: CanchaParaInsertar[] = [];

    for (const el of elementos) {
      const coords = getCoords(el);
      if (!coords) continue;

      const tags    = el.tags ?? {};
      const deporte = getDeporte(tags).filter(d => deportesFiltro.includes(d));
      if (deporte.length === 0) continue;

      totalEncontradas++;

      // Saltar si ya está en DB
      const osmKey = `${el.type}:${el.id}`;
      if (osmExistentes.has(osmKey)) {
        totalSaltadas++;
        if (verbose) console.log(`  ⏭️  [${osmKey}] ya existe — saltando`);
        continue;
      }

      // Dirección
      let direccion = getDireccionDeOSM(tags);
      let comuna: string | null = tags['addr:city'] ?? tags['addr:suburb'] ?? null;

      if (!direccion && !skipGeocode) {
        // Rate limit Nominatim: max 1 req/s
        await sleep(1500);
        const geo = await reverseGeocode(coords.lat, coords.lng);
        direccion = geo.direccion;
        if (!comuna) comuna = geo.comuna;
      }
      direccion = direccion ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

      const cancha: CanchaParaInsertar = {
        nombre:            getNombre(tags, deporte, ciudad),
        direccion,
        lat:               coords.lat,
        lng:               coords.lng,
        deporte,
        es_publica:        getEsPublica(tags),
        precio_hora:       null,
        telefono_contacto: tags.phone ?? tags['contact:phone'] ?? null,
        nombre_recinto:    tags.operator ?? tags.brand ?? null,
        superficie:        getSuperficie(tags),
        iluminacion:       getIluminacion(tags),
        region:            ciudad.region,
        comuna,
        osm_id:            el.id,
        osm_type:          el.type,
        agregada_por:      adminUserId,
      };

      canchasCiudad.push(cancha);

      if (verbose) {
        console.log(`  ✅ [${el.type}:${el.id}] ${cancha.nombre}`);
        console.log(`     Deportes: ${deporte.join(', ')} | Dirección: ${cancha.direccion}`);
      }
    }

    // Deduplicar por proximidad dentro de la ciudad
    const canchasDedup = deduplicarPorProximidad(canchasCiudad);
    console.log(`\n   📊 Encontradas: ${canchasCiudad.length} → después de deduplicar: ${canchasDedup.length}`);

    todasLasCanchas.push(...canchasDedup);

    // Espera entre ciudades para no martillar Overpass
    if (ciudadesAImportar.length > 1) await sleep(5000);
  }

  // ── Resumen
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 RESUMEN`);
  console.log(`   Encontradas en OSM : ${totalEncontradas}`);
  console.log(`   Ya en DB (saltadas): ${totalSaltadas}`);
  console.log(`   Nuevas a insertar  : ${todasLasCanchas.length}`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Preview (dry-run)
  if (dryRun) {
    console.log('🔍 DRY RUN — mostrando primeras 20 canchas:\n');
    todasLasCanchas.slice(0, 20).forEach((c, i) => {
      console.log(`${String(i + 1).padStart(3)}. ${c.nombre}`);
      console.log(`     [${c.deporte.join('+')}]  ${c.direccion}`);
      console.log(`     lat: ${c.lat.toFixed(5)}, lng: ${c.lng.toFixed(5)}`);
      if (c.superficie)        console.log(`     superficie: ${c.superficie}`);
      if (c.iluminacion != null) console.log(`     iluminacion: ${c.iluminacion ? 'sí' : 'no'}`);
      if (c.nombre_recinto)    console.log(`     recinto: ${c.nombre_recinto}`);
      console.log(`     osm: ${c.osm_type}/${c.osm_id}`);
      console.log();
    });

    if (todasLasCanchas.length > 20) {
      console.log(`… y ${todasLasCanchas.length - 20} más.\n`);
    }

    // Resumen por deporte
    const countByDeporte: Record<string, number> = {};
    for (const c of todasLasCanchas) {
      for (const d of c.deporte) {
        countByDeporte[d] = (countByDeporte[d] ?? 0) + 1;
      }
    }
    console.log('📊 Distribución por deporte:');
    for (const [d, count] of Object.entries(countByDeporte).sort((a,b) => b[1]-a[1])) {
      console.log(`   ${d.padEnd(12)} ${count} canchas`);
    }
    console.log('\n✋ Dry-run completado. Ejecuta sin --dry-run para insertar en DB.');
    return;
  }

  // ── Insertar en Supabase
  if (todasLasCanchas.length === 0) {
    console.log('✅ No hay canchas nuevas para insertar.');
    return;
  }

  if (!supabase) {
    console.error('❌ No hay cliente Supabase disponible para insertar.');
    process.exit(1);
  }

  console.log(`📥 Insertando ${todasLasCanchas.length} canchas en Supabase…\n`);

  // Detectar si la columna osm_id existe (migración 044)
  // Si no existe, insertamos sin ella (deduplicación solo por proximidad en ese caso)
  let tieneOsmId = true;
  {
    const { error: testErr } = await supabase
      .from('canchas')
      .select('osm_id')
      .limit(1);
    if (testErr?.message?.includes('osm_id')) {
      tieneOsmId = false;
      console.warn('⚠️  Columna osm_id no existe (migración 044 no aplicada) — insertando sin osm_id.\n');
    }
  }

  const BATCH_SIZE = 50;
  let insertadas = 0;
  let errores    = 0;

  for (let i = 0; i < todasLasCanchas.length; i += BATCH_SIZE) {
    const batch = todasLasCanchas.slice(i, i + BATCH_SIZE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = batch.map(c => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<string, any> = {
        nombre:            c.nombre,
        direccion:         c.direccion,
        lat:               c.lat,
        lng:               c.lng,
        deporte:           c.deporte,
        es_publica:        c.es_publica,
        precio_hora:       c.precio_hora,
        telefono_contacto: c.telefono_contacto,
        nombre_recinto:    c.nombre_recinto,
        superficie:        c.superficie,
        iluminacion:       c.iluminacion,
        region:            c.region,
        comuna:            c.comuna,
        agregada_por:      c.agregada_por,
        fotos:             [],
      };
      if (tieneOsmId) {
        row.osm_id   = c.osm_id;
        row.osm_type = c.osm_type;
      }
      return row;
    });

    const { error } = await supabase.from('canchas').insert(rows);

    if (error) {
      console.error(`  ❌ Error en batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      errores += batch.length;
    } else {
      insertadas += batch.length;
      process.stdout.write(`  ✅ ${insertadas}/${todasLasCanchas.length} insertadas\r`);
    }
  }

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`✅ IMPORT COMPLETADO`);
  console.log(`   Insertadas: ${insertadas}`);
  if (errores > 0) console.log(`   ❌ Con error: ${errores}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
