export interface TeamRankingStat {
  id: string;
  nombre: string;
  color: string;
  puntos: number;
  kingCourts: number;
  totalVictorias: number;
  totalDerrotas: number;
  winRate: number;
  miembros: number;
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
