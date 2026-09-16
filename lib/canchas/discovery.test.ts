import { describe, it, expect, vi } from 'vitest';
import {
  descubrirCanchas,
  distanciaMetros,
  type CanchaExistente,
  type CanchaNueva,
  type PuertoCanchas,
} from './discovery';
import type { LugarGoogle } from '@/lib/google/places';

/**
 * Puerto en memoria: los tests no tocan Supabase ni Google. `insertadas`
 * modela el índice único — un place id que ya está no vuelve a entrar.
 */
function puertoFake(existentes: CanchaExistente[] = []) {
  const insertadas: CanchaNueva[] = [];
  const vinculadas: Array<{ canchaId: string; placeId: string }> = [];

  const puerto: PuertoCanchas = {
    async canchasEnArea() {
      return existentes;
    },
    async insertarPendientes(canchas) {
      let creadas = 0;
      for (const c of canchas) {
        const yaEsta =
          insertadas.some((i) => i.google_place_id === c.google_place_id) ||
          existentes.some((e) => e.google_place_id === c.google_place_id);
        if (yaEsta) continue;
        insertadas.push(c);
        creadas++;
      }
      return creadas;
    },
    async vincularPlaceId(canchaId, placeId) {
      vinculadas.push({ canchaId, placeId });
    },
  };

  return { puerto, insertadas, vinculadas };
}

function lugar(placeId: string, lat = -33.02, lng = -71.55, nombre = 'Cancha'): LugarGoogle {
  return { placeId, nombre, lat, lng, direccion: 'Una calle' };
}

const ZONA = { lat: -33.02, lng: -71.55, radioM: 2000 };

describe('descubrirCanchas', () => {
  it('[1] crea como PENDING lo que Google devuelve y KOC no tiene', async () => {
    const { puerto, insertadas } = puertoFake();
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123'), lugar('DEF456', -33.03)]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toEqual({ found: 2, created: 2, duplicated: 0, errors: 0 });
    expect(insertadas.map((c) => c.google_place_id).sort()).toEqual(['ABC123', 'DEF456']);
  });

  it('[2] Google devuelve vacío: no crea nada y no falla', async () => {
    const { puerto, insertadas } = puertoFake();
    const buscar = vi.fn().mockResolvedValue([]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toEqual({ found: 0, created: 0, duplicated: 0, errors: 0 });
    expect(insertadas).toHaveLength(0);
  });

  it('[3] si Google falla, el error sube — no se inventa un resultado vacío', async () => {
    const { puerto } = puertoFake();
    const buscar = vi.fn().mockRejectedValue(new Error('Google Places respondió 429'));

    await expect(descubrirCanchas({ ...ZONA, buscar, puerto })).rejects.toThrow('429');
  });

  it('[4] una cancha con el mismo place id ya guardado no se duplica', async () => {
    const { puerto, insertadas } = puertoFake([
      { id: 'c1', lat: -33.5, lng: -70.6, google_place_id: 'ABC123' },
    ]);
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123'), lugar('DEF456', -33.03)]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toMatchObject({ found: 2, created: 1, duplicated: 1, errors: 0 });
    expect(insertadas.map((c) => c.google_place_id)).toEqual(['DEF456']);
  });

  it('[5] el mismo place id repetido dentro de una respuesta da una sola cancha', async () => {
    const { puerto, insertadas } = puertoFake();
    const buscar = vi.fn().mockResolvedValue([
      lugar('ABC123'),
      lugar('DEF456', -33.03),
      lugar('ABC123'),
    ]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toMatchObject({ found: 3, created: 2, duplicated: 1 });
    expect(insertadas.filter((c) => c.google_place_id === 'ABC123')).toHaveLength(1);
  });

  it('[6] una cancha que ya existe casi en el mismo punto (import OSM) no se duplica', async () => {
    // ~15 m del punto que devuelve Google: es la misma cancha sin place id.
    const { puerto, insertadas, vinculadas } = puertoFake([
      { id: 'osm-1', lat: -33.02, lng: -71.55, google_place_id: null },
    ]);
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123', -33.020135, -71.55)]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toMatchObject({ found: 1, created: 0, duplicated: 1, errors: 0 });
    expect(insertadas).toHaveLength(0);
    // Y le queda anotado el place id, para que la próxima corrida la descarte
    // por id en vez de por distancia.
    expect(vinculadas).toEqual([{ canchaId: 'osm-1', placeId: 'ABC123' }]);
  });

  it('dos resultados cercanos no se vinculan a la misma cancha existente', async () => {
    const { puerto, insertadas, vinculadas } = puertoFake([
      { id: 'osm-1', lat: -33.02, lng: -71.55, google_place_id: null },
    ]);
    const buscar = vi.fn().mockResolvedValue([
      lugar('ABC123', -33.020135, -71.55),
      lugar('DEF456', -33.020136, -71.55),
    ]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(vinculadas).toHaveLength(1);
    // El segundo ya no tiene a quién pegarse: entra como cancha nueva.
    expect(stats).toMatchObject({ created: 1, duplicated: 1 });
    expect(insertadas.map((c) => c.google_place_id)).toEqual(['DEF456']);
  });

  it('una cancha lejana no se confunde con la que devuelve Google', async () => {
    const { puerto, insertadas } = puertoFake([
      { id: 'otra', lat: -33.05, lng: -71.55, google_place_id: null },
    ]);
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123', -33.02, -71.55)]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto });

    expect(stats).toMatchObject({ created: 1, duplicated: 0 });
    expect(insertadas).toHaveLength(1);
  });

  it('lo que rebota el índice único cuenta como duplicado, no como error', async () => {
    // Simula la carrera: otra importación insertó el place id en el medio.
    const { puerto } = puertoFake();
    const puertoEnCarrera: PuertoCanchas = { ...puerto, insertarPendientes: async () => 0 };
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123')]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto: puertoEnCarrera });

    expect(stats).toEqual({ found: 1, created: 0, duplicated: 1, errors: 0 });
  });

  it('si vincular falla, se cuenta el error pero la cancha sigue deduplicada', async () => {
    const { puerto, insertadas } = puertoFake([
      { id: 'osm-1', lat: -33.02, lng: -71.55, google_place_id: null },
    ]);
    const puertoRoto: PuertoCanchas = {
      ...puerto,
      vincularPlaceId: async () => { throw new Error('RLS'); },
    };
    const buscar = vi.fn().mockResolvedValue([lugar('ABC123', -33.020135, -71.55)]);

    const stats = await descubrirCanchas({ ...ZONA, buscar, puerto: puertoRoto });

    expect(stats).toMatchObject({ created: 0, duplicated: 1, errors: 1 });
    expect(insertadas).toHaveLength(0);
  });
});

describe('distanciaMetros', () => {
  it('da 0 para el mismo punto', () => {
    expect(distanciaMetros(-33.02, -71.55, -33.02, -71.55)).toBe(0);
  });

  it('un grado de latitud son ~111 km', () => {
    const d = distanciaMetros(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});
