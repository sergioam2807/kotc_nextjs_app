/**
 * Tipos de evento especial.
 *
 * Estaba copiado en cuatro archivos (dashboard, lista de admin, detalle y
 * formulario) y ya había divergido: `nightball` se pintaba gris en admin y
 * violeta en el dashboard, y `otro` tenía dos etiquetas distintas. El mismo
 * evento se veía diferente según dónde lo miraras.
 *
 * Los colores son dato, no tokens del sistema: son el color con el que el
 * admin marca un evento y queda guardado en la DB, igual que el color de un
 * equipo. Por eso van en hex y no como CSS variables.
 */

export interface TipoEvento {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** Qué hace el evento — se muestra al elegir el tipo al crearlo. */
  desc: string;
}

export const TIPOS_EVENTO: TipoEvento[] = [
  { id: 'torneo_express',  label: 'Torneo exprés',   emoji: '🏆', color: '#eab308', desc: 'Competencia corta durante un fin de semana o semana' },
  { id: 'bonus_xp',        label: 'Bonus XP',        emoji: '⚡', color: '#a855f7', desc: 'Multiplica el XP ganado en todos los partidos' },
  { id: 'cancha_especial', label: 'Cancha especial', emoji: '📍', color: '#3b82f6', desc: 'Una cancha destacada con beneficios al ganar' },
  { id: 'nightball',       label: 'Nightball',       emoji: '🌙', color: '#374151', desc: 'Edición nocturna — partidos en canchas iluminadas' },
  { id: 'king_challenge',  label: 'King Challenge',  emoji: '👑', color: '#ef4444', desc: 'El King actual debe defender contra retadores especiales' },
  { id: 'reto_semanal',    label: 'Reto semanal',    emoji: '🎯', color: '#22c55e', desc: 'Objetivo de la semana para ganar bonus o badge' },
  { id: 'otro',            label: 'Evento especial', emoji: '🎉', color: '#f97316', desc: 'Evento personalizado' },
];

const POR_ID: Record<string, TipoEvento> = Object.fromEntries(
  TIPOS_EVENTO.map(t => [t.id, t]),
);

/** Un tipo desconocido cae en 'otro' en vez de romper el render. */
export function tipoEvento(id: string | null | undefined): TipoEvento {
  return (id ? POR_ID[id] : undefined) ?? POR_ID.otro;
}
