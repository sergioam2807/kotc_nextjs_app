export interface ProfileSimple {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nivel: number | null;
  xp: number | null;
}

export type Estado1v1 =
  | 'pendiente'
  | 'aceptado'
  | 'resultado_pendiente'
  | 'completado'
  | 'rechazado';

export interface Resultado1v1 {
  id: string;
  ganador_id: string;
  puntos_retador: number | null;
  puntos_retado: number | null;
  propuesto_por: string;
  confirmado_por_perdedor: boolean;
  disputado: boolean;
  confirmado_at: string | null;
}

export interface Desafio1v1ConDatos {
  id: string;
  retador_id: string;
  retado_id: string;
  deporte: string;
  formato: string;
  fecha: string | null;
  mensaje: string | null;
  estado: Estado1v1;
  created_at: string;
  retador: ProfileSimple | null;
  retado: ProfileSimple | null;
  resultado: Resultado1v1 | null;
}
