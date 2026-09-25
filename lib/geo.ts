/**
 * Utilidades geográficas compartidas.
 *
 * Vive fuera de `lib/canchas` y de `lib/google` porque las usan los dos: el
 * cliente de Places para acotar resultados al radio pedido, y el servicio de
 * descubrimiento para deduplicar por cercanía.
 */

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
