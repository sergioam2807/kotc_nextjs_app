export interface DesafioConDatos {
  id: string;
  deporte: string;
  formato: string;
  fecha: string;
  mensaje: string | null;
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'jugado';
  equipo_retador_id: string;
  equipo_retado_id: string;
  cancha_id: string;
  equipo_retador: { id: string; nombre: string; color: string };
  equipo_retado: { id: string; nombre: string; color: string };
  cancha: { id: string; nombre: string; direccion: string };
  created_at: string;
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
