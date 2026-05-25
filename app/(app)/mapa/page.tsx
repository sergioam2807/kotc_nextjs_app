import { createClient } from '@/lib/supabase/server';
import { MapaClientWrapper } from '@/components/mapa/MapaClientWrapper';
import type { CanchaConEstado } from '@/components/mapa/MapaClientWrapper';

export default async function MapaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Obtener equipo del usuario + deporte principal del equipo
  let equipoId: string | null = null;
  let deporteInicial: string | undefined;

  if (user) {
    const { data: membresia } = await supabase
      .from('equipo_miembros')
      .select('equipo_id, equipo:equipos(id, nombre, color, deporte)')
      .eq('jugador_id', user.id)
      .limit(1)
      .maybeSingle();

    equipoId = membresia?.equipo_id ?? null;

    const equipoRaw = membresia?.equipo;
    const equipoObj = Array.isArray(equipoRaw) ? equipoRaw[0] : equipoRaw;
    if (equipoObj && typeof equipoObj === 'object' && 'deporte' in equipoObj) {
      deporteInicial = (equipoObj as { deporte?: string }).deporte ?? undefined;
    }
  }

  // Queries paralelas: canchas + ranking global de equipos por XP
  const [{ data: canchasRaw }, { data: equiposRanking }] = await Promise.all([
    supabase
      .from('canchas')
      .select(
        'id, nombre, direccion, lat, lng, deporte, es_publica, precio_hora, telefono_contacto, nombre_recinto, cancha_dominio(id, equipo_id, victorias, derrotas, es_king, equipos(id, nombre, color, nivel, xp))'
      )
      .order('created_at', { ascending: false }),

    // Todos los equipos ordenados por XP → posición de ranking
    supabase
      .from('equipos')
      .select('id, xp')
      .order('xp', { ascending: false }),
  ]);

  // Mapa equipo_id → posición de ranking (1-indexed)
  const rankingMap: Record<string, number> = {};
  (equiposRanking ?? []).forEach((e, i) => {
    rankingMap[e.id] = i + 1;
  });

  // Calcular estado de cada cancha respecto al equipo del usuario
  const canchas: CanchaConEstado[] = (canchasRaw ?? []).map((c: Record<string, unknown>) => {
    const dominioArr: Record<string, unknown>[] = Array.isArray(c.cancha_dominio)
      ? (c.cancha_dominio as Record<string, unknown>[])
      : c.cancha_dominio
        ? [c.cancha_dominio as Record<string, unknown>]
        : [];

    const kingEntry = dominioArr.find(d => d.es_king === true) ?? null;

    let estado: 'libre' | 'king' | 'rival' = 'libre';
    let equipoNombre: string | undefined;
    let equipoColor: string | undefined;
    let victorias: number | undefined;
    let derrotas: number | undefined;
    let dominioEquipoId: string | undefined;
    let rankingGlobal: number | undefined;
    let equipoNivel: number | undefined;

    if (kingEntry) {
      dominioEquipoId = kingEntry.equipo_id as string;
      estado = equipoId && dominioEquipoId === equipoId ? 'king' : 'rival';

      const equipo = kingEntry.equipos as Record<string, unknown> | undefined;
      equipoNombre  = equipo?.nombre as string | undefined;
      equipoColor   = equipo?.color  as string | undefined;
      equipoNivel   = equipo?.nivel  as number | undefined;
      victorias     = kingEntry.victorias as number | undefined;
      derrotas      = kingEntry.derrotas  as number | undefined;
      rankingGlobal = dominioEquipoId ? rankingMap[dominioEquipoId] : undefined;
    }

    return {
      id:                 c.id               as string,
      nombre:             c.nombre           as string,
      direccion:          c.direccion        as string,
      lat:                c.lat              as number,
      lng:                c.lng              as number,
      deporte:           (c.deporte          as string[]) ?? [],
      estado,
      equipoId:           dominioEquipoId,
      equipoNombre,
      equipoColor,
      victorias,
      derrotas,
      rankingGlobal,
      equipoNivel,
      es_publica:         c.es_publica       as boolean  ?? true,
      precio_hora:        c.precio_hora      as number   ?? null,
      telefono_contacto:  c.telefono_contacto as string  ?? null,
      nombre_recinto:     c.nombre_recinto   as string   ?? null,
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
      stats={{ misKing, partidos, total }}
      deporteInicial={deporteInicial}
    />
  );
}
