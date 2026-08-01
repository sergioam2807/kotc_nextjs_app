import { describe, it, expect } from 'vitest';
import { computeTabla, computeTablaByGrupo } from './tabla';

const CONFIG = { puntos_victoria: 3, puntos_empate: 1, puntos_derrota: 0 };

const EQUIPOS = [
  { id: 'a', nombre: 'A', color: '#111' },
  { id: 'b', nombre: 'B', color: '#222' },
  { id: 'c', nombre: 'C', color: '#333' },
];

describe('computeTabla', () => {
  it('ordena por Pts desc, luego GD desc, luego GF desc', () => {
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: 'b', puntos_local: 20, puntos_visitante: 10, estado: 'completado' },
      { equipo_local_id: 'b', equipo_visitante_id: 'c', puntos_local: 15, puntos_visitante: 10, estado: 'completado' },
      { equipo_local_id: 'c', equipo_visitante_id: 'a', puntos_local: 5,  puntos_visitante: 25, estado: 'completado' },
    ];
    const rows = computeTabla(EQUIPOS, partidos, CONFIG);
    // a: 2 wins, Pts=6; b: 1 win 1 loss, Pts=3; c: 2 losses, Pts=0
    expect(rows.map(r => r.equipo_id)).toEqual(['a', 'b', 'c']);
    expect(rows[0].Pts).toBe(6);
    expect(rows[0].PG).toBe(2);
  });

  it('ignora partidos no completados o sin puntaje', () => {
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: 'b', puntos_local: null, puntos_visitante: null, estado: 'pendiente' },
    ];
    const rows = computeTabla(EQUIPOS, partidos, CONFIG);
    expect(rows.every(r => r.PJ === 0)).toBe(true);
  });

  it('ignora partidos con equipo_local_id o equipo_visitante_id nulo (bye)', () => {
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: null, puntos_local: 10, puntos_visitante: null, estado: 'completado' },
    ];
    const rows = computeTabla(EQUIPOS, partidos, CONFIG);
    const a = rows.find(r => r.equipo_id === 'a')!;
    expect(a.PJ).toBe(0);
  });

  it('filtra por grupo cuando se especifica grupoFilter', () => {
    const equiposConGrupo = [
      { id: 'a', nombre: 'A', color: '#111', grupo: 'X' },
      { id: 'b', nombre: 'B', color: '#222', grupo: 'Y' },
    ];
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: 'b', puntos_local: 10, puntos_visitante: 5, estado: 'completado', grupo: 'X' },
    ];
    const rowsX = computeTabla(equiposConGrupo, partidos, CONFIG, 'X');
    expect(rowsX.length).toBe(1);
    expect(rowsX[0].equipo_id).toBe('a');
  });

  it('registra empates correctamente cuando se usan puntos_empate', () => {
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: 'b', puntos_local: 10, puntos_visitante: 10, estado: 'completado' },
    ];
    const rows = computeTabla(EQUIPOS, partidos, CONFIG);
    const a = rows.find(r => r.equipo_id === 'a')!;
    const b = rows.find(r => r.equipo_id === 'b')!;
    expect(a.PE).toBe(1);
    expect(b.PE).toBe(1);
    expect(a.Pts).toBe(1);
    expect(b.Pts).toBe(1);
  });
});

describe('computeTablaByGrupo', () => {
  it('separa standings por grupo', () => {
    const equipos = [
      { id: 'a', nombre: 'A', color: '#111', grupo: 'X' },
      { id: 'b', nombre: 'B', color: '#222', grupo: 'X' },
      { id: 'c', nombre: 'C', color: '#333', grupo: 'Y' },
      { id: 'd', nombre: 'D', color: '#444', grupo: 'Y' },
    ];
    const partidos = [
      { equipo_local_id: 'a', equipo_visitante_id: 'b', puntos_local: 20, puntos_visitante: 10, estado: 'completado', grupo: 'X' },
      { equipo_local_id: 'c', equipo_visitante_id: 'd', puntos_local: 5,  puntos_visitante: 15, estado: 'completado', grupo: 'Y' },
    ];
    const byGrupo = computeTablaByGrupo(equipos, partidos, CONFIG);
    expect(Object.keys(byGrupo).sort()).toEqual(['X', 'Y']);
    expect(byGrupo.X[0].equipo_id).toBe('a');
    expect(byGrupo.Y[0].equipo_id).toBe('d');
  });
});
