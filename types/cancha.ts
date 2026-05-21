export interface Cancha {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  fotos: string[];
  horarios: Record<string, string>;
  deporte: string[];
  agregada_por: string;
  validada: boolean;
  created_at: string;
}

export interface CanchaDominio {
  id: string;
  cancha_id: string;
  equipo_id: string;
  temporada_id: string;
  victorias: number;
  derrotas: number;
  es_king: boolean;
  updated_at: string;
  cancha?: Cancha;
  equipo?: { nombre: string; color: string; logo_url: string | null };
}

export type EstadoCancha = 'libre' | 'king' | 'rival';

export interface CanchaConEstado extends Cancha {
  estado: EstadoCancha;
  dominio?: CanchaDominio;
}
