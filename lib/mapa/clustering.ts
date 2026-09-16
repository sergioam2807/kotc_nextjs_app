/**
 * Clustering geométrico para los pines del mapa.
 *
 * Pura a propósito: sin dependencias de Google Maps, así se puede testear y
 * razonar sin levantar un mapa. La capa Canvas (`components/mapa/canchasOverlay.ts`)
 * solo le pasa coordenadas mundiales ya proyectadas.
 */

export type EstadoCancha = 'libre' | 'king' | 'rival';

export interface PuntoMundo {
  /** Coordenada mundial de Google (0–256), independiente de zoom y pan. */
  wx: number;
  wy: number;
  estado: EstadoCancha;
}

export interface GrupoCluster<T extends PuntoMundo> {
  /** Clave de celda: estable mientras no cambie el zoom. */
  key: string;
  /** Centro del grupo en píxeles de canvas. */
  x: number;
  y: number;
  miembros: T[];
  counts: Record<EstadoCancha, number>;
}

export interface OpcionesGrilla {
  /** 2^zoom. */
  scale: number;
  /** Traslación mundo→canvas. */
  offX: number;
  offY: number;
  /** Tamaño del canvas en píxeles CSS. */
  ancho: number;
  alto: number;
  /** Lado de la celda, en píxeles de pantalla. */
  cell: number;
  /** Margen extra: un punto justo afuera igual dibuja su pin dentro. */
  margen: number;
}

/**
 * Agrupa por celdas de una grilla anclada al mundo (no al viewport): al panear,
 * la pertenencia a la celda no cambia, así que los clusters no parpadean; solo
 * se reagrupan al cambiar el zoom, que es cuando el usuario espera que cambien.
 */
export function agruparEnGrilla<T extends PuntoMundo>(
  puntos: readonly T[],
  { scale, offX, offY, ancho, alto, cell, margen }: OpcionesGrilla,
): GrupoCluster<T>[] {
  const celdas = new Map<string, T[]>();

  for (const punto of puntos) {
    const x = punto.wx * scale + offX;
    const y = punto.wy * scale + offY;
    if (x < -margen || y < -margen || x > ancho + margen || y > alto + margen) continue;
    const gx = Math.floor((punto.wx * scale) / cell);
    const gy = Math.floor((punto.wy * scale) / cell);
    const key = `${gx}:${gy}`;
    const celda = celdas.get(key);
    if (celda) celda.push(punto);
    else celdas.set(key, [punto]);
  }

  const grupos: GrupoCluster<T>[] = [];
  celdas.forEach((miembros, key) => {
    let sx = 0;
    let sy = 0;
    const counts: Record<EstadoCancha, number> = { king: 0, libre: 0, rival: 0 };
    for (const m of miembros) {
      sx += m.wx;
      sy += m.wy;
      counts[m.estado] += 1;
    }
    const n = miembros.length;
    grupos.push({
      key,
      x: (sx / n) * scale + offX,
      y: (sy / n) * scale + offY,
      miembros,
      counts,
    });
  });

  return grupos;
}
