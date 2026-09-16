import { describe, it, expect } from 'vitest';
import { agruparEnGrilla, type PuntoMundo } from './clustering';

interface P extends PuntoMundo {
  id: string;
}

const BASE = { offX: 0, offY: 0, ancho: 1000, alto: 1000, cell: 64, margen: 72 };

function punto(id: string, wx: number, wy: number, estado: P['estado'] = 'libre'): P {
  return { id, wx, wy, estado };
}

describe('agruparEnGrilla', () => {
  it('agrupa puntos que caen en la misma celda y separa los que no', () => {
    // scale 1 → las coordenadas mundiales son píxeles. Celda de 64px.
    const puntos = [punto('a', 10, 10), punto('b', 20, 20), punto('c', 200, 200)];
    const grupos = agruparEnGrilla(puntos, { ...BASE, scale: 1 });

    expect(grupos).toHaveLength(2);
    const grande = grupos.find((g) => g.miembros.length === 2);
    expect(grande?.miembros.map((m) => m.id).sort()).toEqual(['a', 'b']);
    // El centro es el promedio de sus miembros.
    expect(grande?.x).toBe(15);
    expect(grande?.y).toBe(15);
  });

  it('cuenta los estados de cada grupo', () => {
    const puntos = [
      punto('a', 10, 10, 'king'),
      punto('b', 12, 12, 'rival'),
      punto('c', 14, 14, 'rival'),
      punto('d', 16, 16, 'libre'),
    ];
    const [grupo] = agruparEnGrilla(puntos, { ...BASE, scale: 1 });
    expect(grupo.counts).toEqual({ king: 1, rival: 2, libre: 1 });
  });

  it('la pertenencia a la celda no cambia al panear — solo al hacer zoom', () => {
    const puntos = [punto('a', 10, 10), punto('b', 20, 20)];
    // Mismo zoom, distinto offset (pan): mismas claves de celda.
    const quieto = agruparEnGrilla(puntos, { ...BASE, scale: 1 });
    const paneado = agruparEnGrilla(puntos, { ...BASE, scale: 1, offX: 137, offY: -48 });
    expect(paneado.map((g) => g.key)).toEqual(quieto.map((g) => g.key));
    // Pero sí se mueven en pantalla junto con el mapa.
    expect(paneado[0].x).toBe(quieto[0].x + 137);

    // Al acercar, los mismos puntos se separan en celdas distintas.
    const acercado = agruparEnGrilla(puntos, { ...BASE, scale: 16 });
    expect(acercado).toHaveLength(2);
  });

  it('descarta lo que está fuera del canvas pero conserva el margen', () => {
    const dentro = punto('dentro', 500, 500);
    const borde = punto('borde', 1000 + 40, 500); // dentro del margen de 72px
    const fuera = punto('fuera', 1000 + 300, 500);

    const grupos = agruparEnGrilla([dentro, borde, fuera], { ...BASE, scale: 1 });
    const ids = grupos.flatMap((g) => g.miembros.map((m) => m.id));
    expect(ids).toContain('dentro');
    expect(ids).toContain('borde');
    expect(ids).not.toContain('fuera');
  });

  it('sin puntos no devuelve grupos', () => {
    expect(agruparEnGrilla([], { ...BASE, scale: 1 })).toEqual([]);
  });
});
