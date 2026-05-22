/**
 * KOTC — Sistema de niveles (1–100)
 *
 * Fórmula de umbral acumulado: xp(n) = 100 · n · (n − 1)
 *
 * Ejemplos:
 *   Nivel  2 →     200 XP  (primer umbral, igual al sistema anterior)
 *   Nivel  5 →   2 000 XP
 *   Nivel 10 →   9 000 XP
 *   Nivel 20 →  38 000 XP
 *   Nivel 50 → 245 000 XP
 *   Nivel 100→ 990 000 XP
 *
 * XP necesario dentro de un nivel para avanzar:
 *   nivel n → n+1 = 200 · n  (crece linealmente)
 *   Nivel 1→2:  200 XP   Nivel 10→11: 2 000 XP
 *   Nivel 50→51: 10 000 XP  Nivel 99→100: 19 800 XP
 */

export const MAX_NIVEL = 100;

/** XP acumulado mínimo para ESTAR en el nivel n */
export function xpParaNivel(n: number): number {
  if (n <= 1) return 0;
  if (n > MAX_NIVEL) return Infinity;
  return 100 * n * (n - 1);
}

/**
 * Calcula el nivel a partir de XP acumulado.
 * Invierte la fórmula: n = ⌊(1 + √(1 + 4·xp/100)) / 2⌋
 */
export function nivelDesdeXP(xp: number): number {
  if (xp <= 0) return 1;
  const n = Math.floor((1 + Math.sqrt(1 + 4 * xp / 100)) / 2);
  return Math.min(MAX_NIVEL, Math.max(1, n));
}

// ─── Nombres de nivel ──────────────────────────────────────────────────────

const TIERS = [
  'Rookie',    // 1–10
  'Contender', // 11–20
  'Challenger',// 21–30
  'Fighter',   // 31–40
  'Warrior',   // 41–50
  'Elite',     // 51–60
  'Master',    // 61–70
  'Champion',  // 71–80
  'Legend',    // 81–90
  'King',      // 91–100
] as const;

const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Nombre completo del nivel (e.g. "Rookie V", "Elite III", "King of the Court") */
export function nombreNivel(nivel: number): string {
  if (nivel >= MAX_NIVEL) return 'King of the Court';
  if (nivel <= 0) return 'Rookie';
  const tierIdx = Math.floor((nivel - 1) / 10);
  const subLevel = ((nivel - 1) % 10) + 1;
  const tier = TIERS[Math.min(tierIdx, TIERS.length - 1)];
  return subLevel === 1 ? tier : `${tier} ${ROMAN[subLevel - 1]}`;
}

/** Sólo el nombre del tier ("Rookie", "Elite", …) */
export function tierNivel(nivel: number): string {
  if (nivel >= MAX_NIVEL) return 'King';
  const tierIdx = Math.floor((nivel - 1) / 10);
  return TIERS[Math.min(tierIdx, TIERS.length - 1)];
}

// ─── Helpers para la barra de XP ───────────────────────────────────────────

/** XP acumulado al inicio del nivel actual */
export function xpInicioNivel(nivel: number): number {
  return xpParaNivel(nivel);
}

/** XP acumulado necesario para alcanzar el siguiente nivel */
export function xpSiguienteNivel(nivel: number): number {
  if (nivel >= MAX_NIVEL) return xpParaNivel(MAX_NIVEL);
  return xpParaNivel(nivel + 1);
}

/** XP necesario dentro del nivel para avanzar (= 200 · nivel) */
export function xpNecesarioEnNivel(nivel: number): number {
  if (nivel >= MAX_NIVEL) return 0;
  return 200 * nivel;
}

/** Porcentaje de progreso dentro del nivel actual (0–100) */
export function porcentajeEnNivel(xp: number, nivel: number): number {
  if (nivel >= MAX_NIVEL) return 100;
  const inicio = xpInicioNivel(nivel);
  const necesario = xpNecesarioEnNivel(nivel);
  return Math.min(100, Math.max(0, Math.round(((xp - inicio) / necesario) * 100)));
}
