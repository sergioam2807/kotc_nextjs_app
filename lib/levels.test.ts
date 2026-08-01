import { describe, it, expect } from 'vitest';
import {
  xpParaNivel,
  nivelDesdeXP,
  nombreNivel,
  tierNivel,
  xpNecesarioEnNivel,
  porcentajeEnNivel,
  MAX_NIVEL,
} from './levels';

describe('xpParaNivel / nivelDesdeXP round-trip', () => {
  it('coincide con los umbrales documentados', () => {
    expect(xpParaNivel(1)).toBe(0);
    expect(xpParaNivel(5)).toBe(2000);
    expect(xpParaNivel(10)).toBe(9000);
    expect(xpParaNivel(20)).toBe(38000);
    expect(xpParaNivel(50)).toBe(245000);
    expect(xpParaNivel(100)).toBe(990000);
  });

  it('nivelDesdeXP invierte xpParaNivel para el umbral exacto de cada nivel', () => {
    for (const n of [1, 2, 5, 10, 20, 50, 99, 100]) {
      const xp = xpParaNivel(n);
      expect(nivelDesdeXP(xp)).toBe(n);
    }
  });

  it('un XP justo debajo del umbral de un nivel da el nivel anterior', () => {
    const xp = xpParaNivel(10) - 1;
    expect(nivelDesdeXP(xp)).toBe(9);
  });

  it('clampea nivel a [1, MAX_NIVEL]', () => {
    expect(nivelDesdeXP(-100)).toBe(1);
    expect(nivelDesdeXP(0)).toBe(1);
    expect(nivelDesdeXP(999999999)).toBe(MAX_NIVEL);
  });
});

describe('nombreNivel', () => {
  it('nivel 1 no lleva número romano', () => {
    expect(nombreNivel(1)).toBe('Rookie');
  });

  it('sub-niveles usan número romano desde el 2', () => {
    expect(nombreNivel(2)).toBe('Rookie II');
    expect(nombreNivel(5)).toBe('Rookie V');
  });

  it('nivel 100 es "King of the Court"', () => {
    expect(nombreNivel(100)).toBe('King of the Court');
  });

  it('respeta los rangos de tier documentados', () => {
    expect(tierNivel(1)).toBe('Rookie');
    expect(tierNivel(11)).toBe('Contender');
    expect(tierNivel(21)).toBe('Challenger');
    expect(tierNivel(91)).toBe('King');
  });
});

describe('xpNecesarioEnNivel', () => {
  it('crece linealmente como 200 * nivel', () => {
    expect(xpNecesarioEnNivel(1)).toBe(200);
    expect(xpNecesarioEnNivel(10)).toBe(2000);
    expect(xpNecesarioEnNivel(50)).toBe(10000);
  });

  it('es 0 en el nivel máximo (no hay siguiente nivel)', () => {
    expect(xpNecesarioEnNivel(MAX_NIVEL)).toBe(0);
  });
});

describe('porcentajeEnNivel', () => {
  it('es 0% al inicio exacto del nivel', () => {
    const inicio = xpParaNivel(10);
    expect(porcentajeEnNivel(inicio, 10)).toBe(0);
  });

  it('es 100% en el nivel máximo', () => {
    expect(porcentajeEnNivel(999999999, MAX_NIVEL)).toBe(100);
  });

  it('nunca excede el rango [0, 100]', () => {
    expect(porcentajeEnNivel(xpParaNivel(10) - 500, 10)).toBeGreaterThanOrEqual(0);
    expect(porcentajeEnNivel(xpParaNivel(11) + 500, 10)).toBeLessThanOrEqual(100);
  });
});
