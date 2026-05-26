import { createClient } from '@/lib/supabase/server';
import { MapaClientWrapper } from '@/components/mapa/MapaClientWrapper';
import type { CanchaConEstado, KingInfo } from '@/components/mapa/MapaClientWrapper';

export default async function MapaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Equipo del usuario (for king/rival/libre status)
  let equipoId: string | null = null;
  if (user) {
    const { data: membresia } = await supabase
      .from('equipo_miembros')
      .select('equipo_id')
      .eq('jugador_id', user.id)
      .limit(1)
      .maybeSingle();
    equipoId = membresia?.equipo_id ?? null;
  }

  // Queries paralelas: canchas + ranking XP global
  const [{ data: canchasRaw }, { data: equiposRanking }] = await Promise.all([
    supabase
      .from('canchas')
      .select(
        'id, nombre, direccion, lat, lng, deporte, es_publica, precio_hora, telefono_contacto, nombre_recinto, ' +
        'cancha_dominio(id, equipo_id, jugador_id, victorias, derrotas, es_king, formato, equipos(id, nombre, color, nivel, xp))'
      )
      .order('created_at', { ascending: false }),

    supabase
      .from('equipos')
      .select('id, xp')
      .order('xp', { ascending: false }),
  ]);

  // XP-based ranking position for each team
  const rankingMap: Record<string, number> = {};
  (equiposRanking ?? []).forEach((e, i) => { rankingMap[e.id] = i + 1; });

  // Collect all jugador_id values from 1v1 king entries → fetch their display names
  const jugadorIdsSet = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (canchasRaw ?? []) as any[]) {
    const dominioArr: Record<string, unknown>[] = Array.isArray(c.cancha_dominio)
      ? (c.cancha_dominio as Record<string, unknown>[])
      : c.cancha_dominio ? [c.cancha_dominio as Record<string, unknown>] : [];
    for (const d of dominioArr) {
      if (d.es_king === true && d.jugador_id) {
        jugadorIdsSet.add(d.jugador_id as string);
      }
    }
  }

  const jugadorIds = Array.from(jugadorIdsSet);
  const { data: jugadoresData } = jugadorIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', jugadorIds)
    : { data: [] };

  const jugadorMap: Record<string, { display_name: string | null; username: string | null }> =
    Object.fromEntries((jugadoresData ?? []).map(j => [j.id, j]));

  // Build CanchaConEstado for each court
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canchas: CanchaConEstado[] = ((canchasRaw ?? []) as any[]).map((c: Record<string, unknown>) => {
    const dominioArr: Record<string, unknown>[] = Array.isArray(c.cancha_dominio)
      ? (c.cancha_dominio as Record<string, unknown>[])
      : c.cancha_dominio
        ? [c.cancha_dominio as Record<string, unknown>]
        : [];

    // Build kingsPerFormato from all es_king=true entries
    const kingsPerFormato: Record<string, KingInfo> = {};
    for (const d of dominioArr) {
      if (d.es_king !== true) continue;
      const fmt = d.formato as string ?? 'general';
      const equipo = d.equipos as Record<string, unknown> | undefined | null;
      const equipoObj = Array.isArray(equipo) ? (equipo as Record<string, unknown>[])[0] : equipo;

      const jugadorId = d.jugador_id as string | undefined;
      const jugadorProfile = jugadorId ? jugadorMap[jugadorId] : undefined;

      kingsPerFormato[fmt] = {
        equipoId:    d.equipo_id as string | undefined,
        equipoNombre: equipoObj?.nombre as string | undefined,
        equipoColor:  equipoObj?.color  as string | undefined,
        equipoNivel:  equipoObj?.nivel  as number | undefined,
        jugadorId,
        jugadorNombre: jugadorProfile
          ? (jugadorProfile.display_name ?? jugadorProfile.username ?? undefined)
          : undefined,
        victorias: d.victorias as number ?? 0,
        derrotas:  d.derrotas  as number ?? 0,
      };
    }

    // General king drives the initial server-side estado
    const generalKing = kingsPerFormato['general'] ?? null;

    let estado: 'libre' | 'king' | 'rival' = 'libre';
    let equipoNombre: string | undefined;
    let equipoColor:  string | undefined;
    let victorias:    number | undefined;
    let derrotas:     number | undefined;
    let dominioEquipoId: string | undefined;
    let rankingGlobal:   number | undefined;
    let equipoNivel:     number | undefined;

    if (generalKing?.equipoId) {
      dominioEquipoId = generalKing.equipoId;
      estado       = equipoId && dominioEquipoId === equipoId ? 'king' : 'rival';
      equipoNombre = generalKing.equipoNombre;
      equipoColor  = generalKing.equipoColor;
      equipoNivel  = generalKing.equipoNivel;
      victorias    = generalKing.victorias;
      derrotas     = generalKing.derrotas;
      rankingGlobal = rankingMap[dominioEquipoId];
    }

    return {
      id:                 c.id                as string,
      nombre:             c.nombre            as string,
      direccion:          c.direccion         as string,
      lat:                c.lat               as number,
      lng:                c.lng               as number,
      deporte:           (c.deporte           as string[]) ?? [],
      estado,
      equipoId:           dominioEquipoId,
      equipoNombre,
      equipoColor,
      victorias,
      derrotas,
      rankingGlobal,
      equipoNivel,
      kingsPerFormato,
      es_publica:         c.es_publica        as boolean ?? true,
      precio_hora:        c.precio_hora       as number  ?? null,
      telefono_contacto:  c.telefono_contacto as string  ?? null,
      nombre_recinto:     c.nombre_recinto    as string  ?? null,
    };
  });

  const misKing  = canchas.filter((c) => c.estado === 'king').length;
  const partidos = equipoId
    ? canchas
        .filter((c) => c.estado === 'king')
        .reduce((sum, c) => sum + (c.victorias ?? 0) + (c.derrotas ?? 0), 0)
    : 0;
  const total = canchas.length;

  return (
    <MapaClientWrapper
      canchas={canchas}
      equipoId={equipoId}
      userId={user?.id ?? null}
      stats={{ misKing, partidos, total }}
    />
  );
}
