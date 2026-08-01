import { describe, it, expect } from 'vitest';
import { generarRoundRobin, generarRondaEliminacion, generarPartidosGrupos } from './generar';

describe('generarRoundRobin', () => {
  it('genera (n-1) rondas y n/2 partidos por ronda para n par', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const matches = generarRoundRobin(ids);
    const rondas = new Set(matches.map(m => m.ronda));
    expect(rondas.size).toBe(3); // n-1
    expect(matches.length).toBe(6); // n/2 * (n-1) = 2*3
  });

  it('cada equipo enfrenta a todos los demás exactamente una vez', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const matches = generarRoundRobin(ids);
    const pairs = new Set(
      matches.map(m => [m.equipo_local_id, m.equipo_visitante_id].sort().join('-')),
    );
    // C(5,2) = 10 unique pairings
    expect(pairs.size).toBe(10);
    expect(matches.length).toBe(10);
  });

  it('salta los partidos de bye para n impar sin generar equipos fantasma', () => {
    const ids = ['a', 'b', 'c'];
    const matches = generarRoundRobin(ids);
    for (const m of matches) {
      expect(m.equipo_local_id).not.toBe('__bye__');
      expect(m.equipo_visitante_id).not.toBe('__bye__');
    }
    // 3 teams, 1 bye each round → 1 real match per round, 3 rounds (n=4 with bye → n-1=3)
    expect(matches.length).toBe(3);
  });

  it('todos los partidos de round-robin usan fase "regular"', () => {
    const matches = generarRoundRobin(['a', 'b', 'c', 'd']);
    expect(matches.every(m => m.fase === 'regular')).toBe(true);
  });
});

describe('generarRondaEliminacion — fase labeling', () => {
  it('etiqueta correctamente las fases a través de múltiples rondas de un bracket de 8', () => {
    // Round 1: 8 teams → cuartos
    const r1 = generarRondaEliminacion(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 1);
    expect(r1.every(m => m.fase === 'cuartos')).toBe(true);
    expect(r1.length).toBe(4);

    // Round 2: 4 winners → semifinal (this was the bug: used to mislabel 'final')
    const r2 = generarRondaEliminacion(['a', 'c', 'e', 'g'], 2);
    expect(r2.every(m => m.fase === 'semifinal')).toBe(true);
    expect(r2.length).toBe(2);

    // Round 3: 2 winners → final (this was the bug: used to mislabel 'ronda',
    // a value outside liga_partidos.fase's CHECK constraint)
    const r3 = generarRondaEliminacion(['a', 'e'], 3);
    expect(r3.every(m => m.fase === 'final')).toBe(true);
    expect(r3.length).toBe(1);
  });

  it('etiqueta correctamente un bracket de 16 a través de 4 rondas', () => {
    const teams16 = Array.from({ length: 16 }, (_, i) => `t${i}`);
    const r1 = generarRondaEliminacion(teams16, 1);
    expect(r1.every(m => m.fase === 'octavos')).toBe(true);

    const teams8 = teams16.slice(0, 8);
    const r2 = generarRondaEliminacion(teams8, 2);
    expect(r2.every(m => m.fase === 'cuartos')).toBe(true);

    const teams4 = teams8.slice(0, 4);
    const r3 = generarRondaEliminacion(teams4, 3);
    expect(r3.every(m => m.fase === 'semifinal')).toBe(true);

    const teams2 = teams4.slice(0, 2);
    const r4 = generarRondaEliminacion(teams2, 4);
    expect(r4.every(m => m.fase === 'final')).toBe(true);
  });

  it('respeta faseOverride cuando se provee', () => {
    const r = generarRondaEliminacion(['a', 'b'], 1, '3er_lugar');
    expect(r[0].fase).toBe('3er_lugar');
  });

  it('nunca produce una fase fuera del CHECK constraint de liga_partidos', () => {
    const VALID = ['regular', 'grupos', 'octavos', 'cuartos', 'semifinal', '3er_lugar', 'final'];
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 16]) {
      const teams = Array.from({ length: n }, (_, i) => `t${i}`);
      const matches = generarRondaEliminacion(teams, 1);
      for (const m of matches) {
        expect(VALID).toContain(m.fase);
      }
    }
  });
});

describe('generarRondaEliminacion — byes', () => {
  it('genera un bye para el equipo sobrante cuando n es impar, sin perderlo', () => {
    const matches = generarRondaEliminacion(['a', 'b', 'c'], 1);
    // 1 real match (a vs c) + 1 bye (b)
    expect(matches.length).toBe(2);
    const bye = matches.find(m => m.bye);
    expect(bye).toBeDefined();
    expect(bye!.equipo_visitante_id).toBeNull();
    expect(bye!.equipo_local_id).toBe('b'); // middle seed
  });

  it('no genera bye cuando n es par', () => {
    const matches = generarRondaEliminacion(['a', 'b', 'c', 'd'], 1);
    expect(matches.some(m => m.bye)).toBe(false);
    expect(matches.length).toBe(2);
  });

  it('seedea correctamente #1 vs #N, #2 vs #N-1', () => {
    const matches = generarRondaEliminacion(['s1', 's2', 's3', 's4'], 1);
    expect(matches).toContainEqual(
      expect.objectContaining({ equipo_local_id: 's1', equipo_visitante_id: 's4' }),
    );
    expect(matches).toContainEqual(
      expect.objectContaining({ equipo_local_id: 's2', equipo_visitante_id: 's3' }),
    );
  });
});

describe('generarPartidosGrupos', () => {
  it('genera round-robin independiente por grupo con el campo grupo correcto', () => {
    const matches = generarPartidosGrupos({
      A: ['a1', 'a2', 'a3'],
      B: ['b1', 'b2'],
    });
    const grupoA = matches.filter(m => m.grupo === 'A');
    const grupoB = matches.filter(m => m.grupo === 'B');
    expect(grupoA.every(m => m.fase === 'grupos')).toBe(true);
    expect(grupoB.every(m => m.fase === 'grupos')).toBe(true);
    // Group A: 3 teams round-robin (with bye) → 3 matches; Group B: 2 teams → 1 match
    expect(grupoA.length).toBe(3);
    expect(grupoB.length).toBe(1);
    // No cross-group pairings
    for (const m of matches) {
      const teamsA = ['a1', 'a2', 'a3'];
      const teamsB = ['b1', 'b2'];
      const localInA = teamsA.includes(m.equipo_local_id);
      const visInA = teamsA.includes(m.equipo_visitante_id as string);
      const localInB = teamsB.includes(m.equipo_local_id);
      const visInB = teamsB.includes(m.equipo_visitante_id as string);
      expect(localInA === visInA || localInB === visInB).toBe(true);
    }
  });
});
