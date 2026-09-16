/**
 * Moderación de canchas descubiertas y validación de la entrada del import.
 *
 * Funciones puras: la route administrativa se queda con la autorización y el
 * acceso a datos, y todo lo que se puede razonar sin DB se prueba sin DB.
 * Sigue el estilo de validación del resto de las routes (chequeos explícitos,
 * sin librería de schemas — el proyecto no usa zod).
 */

/**
 * Topes de radio. Viven acá y no en el cliente de Google por dos razones: son
 * regla de KOC (un radio enorme es la forma de disparar una importación masiva)
 * y así este módulo se mantiene puro — importar el cliente de Google traería
 * `server-only` a un archivo que solo valida datos.
 *
 * 50 km es además el máximo que acepta `places:searchNearby`.
 */
export const RADIO_MAX_M = 50_000;
export const RADIO_MIN_M = 50;

export type EstadoCancha = 'pending' | 'verified' | 'rejected' | 'closed';

export const ESTADOS_CANCHA: EstadoCancha[] = ['pending', 'verified', 'rejected', 'closed'];

export type AccionModeracion = 'aprobar' | 'rechazar' | 'cerrar';

export const ACCIONES_MODERACION: AccionModeracion[] = ['aprobar', 'rechazar', 'cerrar'];

/**
 * Qué se escribe en la cancha según la acción.
 *
 * `validada` (migración 001) es el booleano de verificación que ya existía; no
 * se duplica en una columna nueva. Rechazar no borra la fila: queda como
 * registro de que esa cancha ya se revisó, para no volver a proponerla.
 */
export function cambiosDeModeracion(accion: AccionModeracion): { status: EstadoCancha; validada: boolean } {
  switch (accion) {
    case 'aprobar':  return { status: 'verified', validada: true };
    case 'rechazar': return { status: 'rejected', validada: false };
    case 'cerrar':   return { status: 'closed',   validada: false };
  }
}

export interface EntradaImport {
  lat: number;
  lng: number;
  radioM: number;
  zona: string | null;
}

export type ResultadoValidacion =
  | { ok: true; valor: EntradaImport }
  | { ok: false; error: string };

/**
 * Valida el cuerpo de una importación.
 *
 * El radio tiene tope por dos motivos: Google no acepta más de 50 km en
 * searchNearby, y un radio enorme es justamente la forma de disparar una
 * importación masiva sin control.
 */
export function validarEntradaImport(body: unknown): ResultadoValidacion {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body inválido' };
  }
  const { latitude, longitude, radius, zona } = body as Record<string, unknown>;

  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, error: 'latitude debe ser un número entre -90 y 90' };
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: 'longitude debe ser un número entre -180 y 180' };
  }
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < RADIO_MIN_M || radius > RADIO_MAX_M) {
    return { ok: false, error: `radius debe estar entre ${RADIO_MIN_M} y ${RADIO_MAX_M} metros` };
  }
  if (zona !== undefined && zona !== null) {
    if (typeof zona !== 'string' || zona.trim().length === 0 || zona.length > 100) {
      return { ok: false, error: 'zona inválida (máx 100 caracteres)' };
    }
  }

  return {
    ok: true,
    valor: {
      lat: latitude,
      lng: longitude,
      radioM: Math.round(radius),
      zona: typeof zona === 'string' ? zona.trim() : null,
    },
  };
}

/** Importaciones permitidas por ventana, para que un admin no dispare una masiva. */
export const LIMITE_IMPORTS = 10;
export const VENTANA_IMPORTS_MIN = 10;

/**
 * El proyecto no tiene rate limiter. En vez de sumar una dependencia, el límite
 * se calcula sobre el historial de runs, que ya se guarda para auditoría y
 * sobrevive a un redeploy (un contador en memoria no).
 */
export function superaLimiteDeImports(inicios: Array<string | Date>, ahora = new Date()): boolean {
  const desde = ahora.getTime() - VENTANA_IMPORTS_MIN * 60_000;
  const recientes = inicios.filter((i) => new Date(i).getTime() >= desde);
  return recientes.length >= LIMITE_IMPORTS;
}
