export type Rol = 'admin' | 'capitan' | 'jugador';
export type Posicion = 'titular' | 'suplente';
// MVP: Basketball únicamente. Ampliar cuando se escale a más deportes.
export type Deporte = 'basketball';
export type Modalidad = '3v3' | '5v5';

export interface Perfil {
  id: string;
  username: string;
  avatar_url: string | null;
  ciudad: string;
  nivel: number;
  xp: number;
  created_at: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  deporte: Deporte;
  modalidad: Modalidad;
  ciudad: string;
  color: string;
  logo_url: string | null;
  nivel: number;
  xp: number;
  creador_id: string;
  temporada_id: string;
  created_at: string;
}

export interface EquipoMiembro {
  id: string;
  equipo_id: string;
  jugador_id: string;
  rol: Rol;
  posicion: Posicion;
  temporada_id: string;
  joined_at: string;
  perfil?: Perfil;
}

export interface Invitacion {
  id: string;
  equipo_id: string;
  invitado_por: string;
  email: string | null;
  telefono: string | null;
  token: string;
  metodo: 'email' | 'whatsapp' | 'link';
  estado: 'pendiente' | 'aceptada' | 'expirada';
  expira_at: string;
  created_at: string;
}
