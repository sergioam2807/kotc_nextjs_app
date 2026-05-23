export const POSICIONES_POR_DEPORTE: Record<string, string[]> = {
  basketball: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
  futbol: ['Portero', 'Defensa Central', 'Lateral', 'Mediocampista', 'Extremo', 'Delantero'],
  voleibol: ['Colocador', 'Líbero', 'Punta', 'Opuesto', 'Central', 'Receptor'],
  tenis: ['Fondo de pista', 'Saque-volea'],
  padel: ['Drive', 'Revés', 'Red'],
};

export const ESPECIALIDADES_POR_DEPORTE: Record<string, string[]> = {
  basketball: ['Triple', 'Penetración', 'Defensa', 'Rebote ofensivo', 'Rebote defensivo', 'Tapón', 'Asistencias', 'Contraataque', 'Post bajo', 'Medio rango'],
  futbol: ['Cabeceo', 'Remate', 'Dribbling', 'Pase largo', 'Presión alta', 'Tiro libre', 'Velocidad', 'Marcación'],
  voleibol: ['Saque potente', 'Saque flotante', 'Remate', 'Bloqueo', 'Defensa', 'Colocación', 'Recepción'],
  tenis: ['Saque potente', 'Volea', 'Derecha', 'Revés', 'Smash', 'Slice', 'Topspin'],
  padel: ['Bandeja', 'Víbora', 'Globo', 'Bajada de pared', 'Saque', 'Pared de cristal'],
};

export const DEPORTES_MAP: Record<string, { emoji: string; label: string }> = {
  basketball: { emoji: '🏀', label: 'Basketball' },
  futbol: { emoji: '⚽', label: 'Fútbol' },
  voleibol: { emoji: '🏐', label: 'Vóleibol' },
  tenis: { emoji: '🎾', label: 'Tenis' },
  padel: { emoji: '🏓', label: 'Pádel' },
};
