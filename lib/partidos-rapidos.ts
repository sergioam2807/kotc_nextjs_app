import type { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MiembroSquad = { jugador_id: string } | { nombre_invitado: string };

type ValidacionError = { error: string; status: number };

/**
 * Valida la forma de un array de hasta 2 compañeros (capitán aparte) para un
 * trío 3v3. Compartido entre el POST de creación (lado a) y el PATCH
 * `aceptar` de un reto directo (lado b) — misma regla en ambos lados.
 */
export function validarSquad(squad: unknown, capitanId: string): ValidacionError | { companeros: MiembroSquad[] } {
  if (squad !== undefined && squad !== null && !Array.isArray(squad)) {
    return { error: 'squad debe ser un array', status: 400 };
  }
  const companeros = (squad ?? []) as MiembroSquad[];
  if (companeros.length > 2) {
    return { error: 'Un trío 3v3 admite máximo 2 compañeros además del capitán', status: 400 };
  }

  const vistos = new Set<string>([capitanId]);
  for (const m of companeros) {
    const tieneJugador = 'jugador_id' in m && !!m.jugador_id;
    const tieneInvitado = 'nombre_invitado' in m && !!m.nombre_invitado;
    if (tieneJugador === tieneInvitado) {
      return { error: 'Cada compañero debe tener jugador_id O nombre_invitado (no ambos)', status: 400 };
    }
    if (tieneJugador) {
      const jid = (m as { jugador_id: string }).jugador_id;
      if (!UUID_RE.test(jid)) return { error: 'jugador_id inválido', status: 400 };
      if (vistos.has(jid)) return { error: 'Un jugador no puede repetirse en el trío', status: 400 };
      vistos.add(jid);
    } else {
      const nombre = (m as { nombre_invitado: string }).nombre_invitado.trim();
      if (!nombre || nombre.length > 40) {
        return { error: 'nombre_invitado debe tener entre 1 y 40 caracteres', status: 400 };
      }
    }
  }
  return { companeros };
}

/** Confirma que todo `jugador_id` de un squad ya validado corresponde a un perfil real. */
export async function jugadoresExisten(supabase: SupabaseClient, companeros: MiembroSquad[]): Promise<boolean> {
  const ids = companeros
    .filter((m): m is { jugador_id: string } => 'jugador_id' in m && !!m.jugador_id)
    .map(m => m.jugador_id);
  if (!ids.length) return true;
  const { data } = await supabase.from('profiles').select('id').in('id', ids);
  return (data ?? []).length === ids.length;
}

/** Construye las filas de `partido_rapido_jugadores` para un lado (capitán + compañeros). */
export function filasJugadoresLado(
  partidoId: string,
  lado: 'a' | 'b',
  capitanId: string,
  companeros: MiembroSquad[],
) {
  return [
    { partido_id: partidoId, lado, jugador_id: capitanId, nombre_invitado: null, es_capitan: true },
    ...companeros.map(m => (
      'jugador_id' in m && m.jugador_id
        ? { partido_id: partidoId, lado, jugador_id: m.jugador_id, nombre_invitado: null, es_capitan: false }
        : { partido_id: partidoId, lado, jugador_id: null, nombre_invitado: (m as { nombre_invitado: string }).nombre_invitado.trim(), es_capitan: false }
    )),
  ];
}

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

export interface PartidoRapidoEnriquecido {
  id: string;
  cancha_id: string;
  cancha_nombre: string;
  deporte: string;
  formato: string;
  estado: string;
  es_vs_king: boolean;
  capitan_a_id: string;
  capitan_a_nombre: string;
  capitan_b_id: string | null;
  /** Nombre del retado — resuelto aunque todavía no haya aceptado (sin fila propia en partido_rapido_jugadores). */
  capitan_b_nombre: string | null;
  created_at: string;
  matched_at: string | null;
  jugadores: JugadorPartidoRapido[];
  resultado: ResultadoPartidoRapido | null;
}

/**
 * Trae un partido rápido con su cancha, jugadores (con perfil si son
 * registrados) y resultado, si existe. Se reutiliza en el POST de creación
 * (tras intentar emparejar), en el GET de detalle (polling del cliente
 * mientras está "buscando") y en el GET de listado para /desafios.
 */
export async function fetchPartidoRapido(
  supabase: SupabaseClient,
  partidoId: string,
): Promise<PartidoRapidoEnriquecido | null> {
  const { data: partido } = await supabase
    .from('partidos_rapidos')
    .select('id, cancha_id, deporte, formato, estado, es_vs_king, capitan_a_id, capitan_b_id, created_at, matched_at, canchas(nombre)')
    .eq('id', partidoId)
    .maybeSingle();

  if (!partido) return null;

  const [{ data: jugadoresRaw }, { data: resultado }] = await Promise.all([
    supabase
      .from('partido_rapido_jugadores')
      .select('id, lado, jugador_id, nombre_invitado, es_capitan')
      .eq('partido_id', partidoId),
    supabase
      .from('resultados_partido_rapido')
      .select('id, ganador_lado, puntos_a, puntos_b, propuesto_por, confirmado_por_perdedor, disputado')
      .eq('partido_id', partidoId)
      .maybeSingle(),
  ]);

  const jugadores = jugadoresRaw ?? [];
  // Los dos capitanes entran siempre al lookup de perfiles, aunque el
  // retado todavía no tenga fila en partido_rapido_jugadores (reto
  // 'pendiente' sin aceptar) — su nombre igual se necesita para mostrar
  // "le retaste a X" antes de que acepte.
  const jugadorIds = [...new Set([
    ...jugadores.map(j => j.jugador_id).filter((v): v is string => !!v),
    partido.capitan_a_id,
    ...(partido.capitan_b_id ? [partido.capitan_b_id] : []),
  ])];

  const { data: perfiles } = jugadorIds.length
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', jugadorIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[] };

  const perfilMap = Object.fromEntries((perfiles ?? []).map(p => [p.id, p]));
  const nombreDePerfil = (id: string | null) => {
    if (!id) return null;
    const p = perfilMap[id];
    return p?.display_name ?? p?.username ?? 'Jugador';
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canchaRaw = (partido as any).canchas as { nombre?: string } | { nombre?: string }[] | null;
  const canchaObj = Array.isArray(canchaRaw) ? canchaRaw[0] : canchaRaw;

  return {
    id: partido.id,
    cancha_id: partido.cancha_id,
    cancha_nombre: canchaObj?.nombre ?? 'Cancha',
    deporte: partido.deporte,
    formato: partido.formato,
    estado: partido.estado,
    es_vs_king: partido.es_vs_king,
    capitan_a_id: partido.capitan_a_id,
    capitan_a_nombre: nombreDePerfil(partido.capitan_a_id) ?? 'Jugador',
    capitan_b_id: partido.capitan_b_id,
    capitan_b_nombre: nombreDePerfil(partido.capitan_b_id),
    created_at: partido.created_at,
    matched_at: partido.matched_at,
    jugadores: jugadores.map(j => ({
      id: j.id,
      lado: j.lado as 'a' | 'b',
      jugador_id: j.jugador_id,
      nombre_invitado: j.nombre_invitado,
      es_capitan: j.es_capitan,
      perfil: j.jugador_id ? perfilMap[j.jugador_id] ?? null : null,
    })),
    resultado: (resultado as ResultadoPartidoRapido | null) ?? null,
  };
}
