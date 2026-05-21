import type { Cancha } from './cancha';
import type { Equipo } from './equipo';

export type EstadoDesafio = 'pendiente' | 'aceptado' | 'rechazado' | 'jugado';

export interface Temporada {
  id: string;
  nombre: string;
  deporte: string;
  inicio: string;
  fin: string;
  activa: boolean;
}

export interface Desafio {
  id: string;
  cancha_id: string;
  equipo_retador_id: string;
  equipo_retado_id: string;
  modalidad: string;
  fecha_hora: string;
  estado: EstadoDesafio;
  con_cambios: boolean;
  created_at: string;
  cancha?: Cancha;
  equipo_retador?: Equipo;
  equipo_retado?: Equipo;
}

export interface Resultado {
  id: string;
  desafio_id: string;
  puntos_retador: number;
  puntos_retado: number;
  ganador_id: string;
  confirmado_retador: boolean;
  confirmado_retado: boolean;
  created_at: string;
  desafio?: Desafio;
}
