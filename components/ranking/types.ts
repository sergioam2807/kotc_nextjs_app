export interface TeamRankingStat {
  id: string;
  nombre: string;
  color: string;
  ciudad: string | null;
  deporte: string | null;
  puntos: number;
  kingCourts: number;
  totalVictorias: number;
  totalDerrotas: number;
  winRate: number;
  miembros: number;
  xp: number;
  nivel: number;
}

export interface PlayerRankingStat {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  nivel: number;
  xp: number;
  equipoNombre: string | null;
  equipoColor: string | null;
}

export interface Player1v1Stat {
  jugador_id: string;
  displayName: string;
  avatarUrl: string | null;
  nivel: number;
  xp: number;
  puntos: number;
  victorias: number;
  derrotas: number;
  racha_actual: number;
  racha_max: number;
  equipoNombre: string | null;
  equipoColor: string | null;
}
