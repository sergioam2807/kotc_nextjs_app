// MVP: Basketball únicamente.
// Cuando se agreguen más deportes, añadir las entradas correspondientes aquí.

export const POSICIONES_POR_DEPORTE: Record<string, string[]> = {
  basketball: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
};

export const ESPECIALIDADES_POR_DEPORTE: Record<string, string[]> = {
  basketball: [
    'Triple', 'Penetración', 'Defensa', 'Rebote ofensivo',
    'Rebote defensivo', 'Tapón', 'Asistencias', 'Contraataque',
    'Post bajo', 'Medio rango',
  ],
};

export const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
  // futbol:     { emoji: '⚽', label: 'Fútbol' },      // próximamente
  // voleibol:   { emoji: '🏐', label: 'Vóleibol' },    // próximamente
  // tenis:      { emoji: '🎾', label: 'Tenis' },        // próximamente
  // padel:      { emoji: '🏓', label: 'Pádel' },        // próximamente
};
