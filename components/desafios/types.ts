export type EstadoDesafio = 'pendiente' | 'aceptado' | 'rechazado' | 'jugado' | 'resultado_pendiente' | 'disputado' | 'completado' | 'cancelado';

export interface ResultadoDesafio {
  id: string;
  desafio_id: string;
  ganador_id: string;
  propuesto_por: string;
  puntos_retador: number | null;
  puntos_retado: number | null;
  confirmado_por_perdedor: boolean;
  disputado: boolean;
  disputa_at: string | null;
  confirmado_at: string | null;
  created_at: string;
}

export interface DesafioConDatos {
  id: string;
  deporte: string;
  formato: string;
  fecha: string;
  mensaje: string | null;
  estado: EstadoDesafio;
  equipo_retador_id: string;
  equipo_retado_id: string;
  cancha_id: string;
  equipo_retador: { id: string; nombre: string; color: string };
  equipo_retado: { id: string; nombre: string; color: string };
  cancha: { id: string; nombre: string; direccion: string };
  created_at: string;
  resultado?: ResultadoDesafio | null;
}

export interface EquipoSimple {
  id: string;
  nombre: string;
  color: string;
}

export interface CanchaSimple {
  id: string;
  nombre: string;
  direccion: string;
}
