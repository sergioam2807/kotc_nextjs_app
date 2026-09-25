export interface CanchaSimple {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  es_publica?: boolean | null;
  precio_hora?: number | null;
  nombre_recinto?: string | null;
  superficie?: string | null;
  /** Rey 3v3 vigente de esta cancha, resuelto server-side (null si nadie la domina aún). */
  king?: { jugadorId: string; nombre: string } | null;
}

export interface JugadorBusqueda {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nivel: number | null;
}

export type EstadoPartidoRapido =
  | 'pendiente'
  | 'buscando'
  | 'emparejado'
  | 'resultado_pendiente'
  | 'disputado'
  | 'completado'
  | 'cancelado'
  | 'rechazado';

export interface JugadorPartidoRapido {
  id: string;
  lado: 'a' | 'b';
  jugador_id: string | null;
  nombre_invitado: string | null;
  es_capitan: boolean;
  perfil: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

export interface ResultadoPartidoRapido {
  id: string;
  ganador_lado: 'a' | 'b';
  puntos_a: number | null;
  puntos_b: number | null;
  propuesto_por: string;
  confirmado_por_perdedor: boolean;
  disputado: boolean;
}

export interface PartidoRapidoConDatos {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  deporte: string;
  formato: string;
  estado: EstadoPartidoRapido;
  es_vs_king: boolean;
  capitan_a_id: string;
  capitan_a_nombre: string;
  capitan_b_id: string | null;
  capitan_b_nombre: string | null;
  created_at: string;
  matched_at: string | null;
  jugadores: JugadorPartidoRapido[];
  resultado: ResultadoPartidoRapido | null;
}
